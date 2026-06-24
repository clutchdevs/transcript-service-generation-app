import { Component, inject, signal, computed, effect, untracked, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Button } from '../../../../shared/components/ui/button/button';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { ToastService } from '../../../../core/services/toast/toast';
import { TranscriptionDraftService } from '../../../../core/services/transcription-draft/transcription-draft';
import { Transcriptions as TranscriptionsService } from '../../../../core/services/transcriptions/transcriptions';
import { TranscriptionJob } from '../../../../core/services/transcriptions/transcriptions.types';
import { TranscriptResponse, TranscriptTranslationSegment, TranscriptFeatureError, TranscriptResult } from '../../../../core/services/transcriptions/transcriptions.types';
import { NavigationService } from '../../../../core/services/navigation/navigation';
import { TranscriptionEventsCoordinatorService } from '../../../../core/services/transcription-events/transcription-events-coordinator';
import {
  cloneTranscriptResults,
  composeTranscriptFromResults,
  EditableTranscriptResult,
  getResultContent,
  insertResultAfter,
  isDeletedResult,
  restoreResult,
  serializeTranscriptResults,
  softDeleteResult,
  updateResultContent,
} from '../../../../core/integrations/speechmatics/transcript-editor';

@Component({
  selector: 'app-transcription-detail',
  standalone: true,
  imports: [CommonModule, Button, Modal],
  templateUrl: './transcription-detail.html',
  styleUrl: './transcription-detail.scss'
})
export class TranscriptionDetail implements OnInit, OnDestroy {
  // TODO(FE-ST-003): Load editorDefaults from AppSettingsService instead of using fixed editor behavior.
  private readonly AUTOSAVE_DEBOUNCE_MS = 1500;

  private route = inject(ActivatedRoute);
  private transcriptionsService = inject(TranscriptionsService);
  private navigation = inject(NavigationService);
  private toast = inject(ToastService);
  private draftService = inject(TranscriptionDraftService);
  private transcriptionEvents = inject(TranscriptionEventsCoordinatorService);
  private destroy$ = new Subject<void>();
  private autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
  private relativeTimeInterval: ReturnType<typeof setInterval> | null = null;
  private lastHandledRealtimeEventKey: string | null = null;

  // Signals para el estado
  readonly job = signal<TranscriptionJob | null>(null);
  readonly transcript = signal<string>('');
  readonly editedTranscript = signal<string>('');
  readonly originalTranscriptResults = signal<TranscriptResult[]>([]);
  readonly editedTranscriptResults = signal<EditableTranscriptResult[]>([]);
  readonly savedEditedTranscriptSnapshot = signal('');
  readonly editingTokenIndex = signal<number | null>(null);
  readonly editingTokenValue = signal('');
  readonly showDeletedTokens = signal(false);
  readonly transcriptMode = signal<'original' | 'edited'>('original');
  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly lastSavedAt = signal<number | null>(null);
  readonly nowTimestamp = signal(Date.now());
  readonly isLoading = signal(false);
  readonly isLoadingTranscript = signal(false);
  readonly error = signal<string | null>(null);
  readonly summaryContent = signal('');
  readonly translationsMap = signal<Record<string, TranscriptTranslationSegment[]>>({});
  readonly translationErrors = signal<TranscriptFeatureError[]>([]);
  readonly summarizationErrors = signal<TranscriptFeatureError[]>([]);

  readonly showCancelModal = signal(false);
  readonly showDeleteModal = signal(false);
  readonly showEditTitleModal = signal(false);
  readonly editTitleValue = signal('');

  // Computed signals
  readonly hasTranscript = computed(() => !!this.transcript() && this.transcript().length > 0);
  readonly activeTranscript = computed(() => this.transcriptMode() === 'edited' ? this.editedTranscript() : this.transcript());
  readonly hasSummary = computed(() => this.summaryContent().trim().length > 0);
  readonly translationLanguageCodes = computed(() => Object.keys(this.translationsMap()));
  readonly hasTranslations = computed(() => this.translationLanguageCodes().length > 0);
  readonly visibleEditedTranscriptResults = computed(() => {
    const results = this.editedTranscriptResults();
    return this.showDeletedTokens() ? results : results.filter((result) => !isDeletedResult(result));
  });
  readonly hasUnsavedChanges = computed(() => serializeTranscriptResults(this.editedTranscriptResults()) !== this.savedEditedTranscriptSnapshot());
  readonly canSaveEdits = computed(() => this.hasUnsavedChanges() && this.saveStatus() !== 'saving');
  readonly saveStatusMessage = computed(() => {
    switch (this.saveStatus()) {
      case 'saving':
        return 'Guardando...';
      case 'saved':
        if (this.lastSavedAt()) {
          return `Guardado ${new Date(this.lastSavedAt() as number).toLocaleTimeString()}`;
        }
        return 'Guardado';
      case 'error':
        return 'Error al guardar';
      default:
        return '';
    }
  });
  readonly saveStatusBadgeClasses = computed(() => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';

    if (this.saveStatus() === 'saving') {
      return `${base} bg-amber-100 text-amber-800`;
    }

    if (this.saveStatus() === 'saved') {
      return `${base} bg-green-100 text-green-800`;
    }

    if (this.saveStatus() === 'error') {
      return `${base} bg-red-100 text-red-800`;
    }

    if (this.hasUnsavedChanges()) {
      return `${base} bg-blue-100 text-blue-800`;
    }

    return `${base} bg-gray-100 text-gray-700`;
  });
  readonly lastSavedRelative = computed(() => {
    const lastSaved = this.lastSavedAt();
    this.nowTimestamp();

    if (!lastSaved) {
      return '';
    }

    const seconds = Math.max(0, Math.floor((Date.now() - lastSaved) / 1000));
    if (seconds < 5) {
      return 'justo ahora';
    }
    if (seconds < 60) {
      return `hace ${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `hace ${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    return `hace ${hours}h`;
  });
  readonly isCompleted = computed(() => this.job()?.statusId === 3);
  readonly isPending = computed(() => this.job()?.statusId === 2);
  readonly hasError = computed(() => this.job()?.statusId === 4);
  readonly isCanceled = computed(() => this.job()?.statusId === 5);

  constructor() {
    effect(() => {
      const event = this.transcriptionEvents.lastEvent();
      const currentJob = untracked(() => this.job());
      if (!event || !currentJob) {
        return;
      }

      const eventKey = `${event.type}:${event.jobId}:${event.transcriptionId ?? ''}`;
      if (event.type !== 'updated' && this.lastHandledRealtimeEventKey === eventKey) {
        return;
      }

      const matchesCurrentJob = event.jobId === currentJob.id || event.transcriptionId === currentJob.referenceId;
      if (!matchesCurrentJob) {
        return;
      }

      if (event.type !== 'updated') {
        this.lastHandledRealtimeEventKey = eventKey;
      }

      if (event.type === 'deleted') {
        this.toast.info('Esta transcripción fue eliminada.');
        this.goBack();
        return;
      }

      if (event.type === 'completed') {
        void this.loadJob(currentJob.id);
        return;
      }

      void this.loadJob(currentJob.id);
    });
  }

  ngOnInit(): void {
    this.relativeTimeInterval = setInterval(() => {
      this.nowTimestamp.set(Date.now());
    }, 1000);

    // Obtener el ID de la ruta
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(async params => {
        const jobId = params['id'];
        if (jobId) {
          this.resetTranscriptState();
          await this.loadJob(jobId);
        } else {
          this.error.set('ID de transcripción no válido');
        }
      });
  }

  ngOnDestroy(): void {
    this.clearAutosaveTimeout();
    if (this.relativeTimeInterval) {
      clearInterval(this.relativeTimeInterval);
      this.relativeTimeInterval = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadJob(jobId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.resetTranscriptState();

    try {
      const foundJob = await this.transcriptionsService.getJobById(jobId);
      this.job.set(foundJob);
      await this.loadTranscriptIfNeeded(foundJob);
    } catch (error) {
      console.error('Error loading job:', error);
      this.error.set('Error al cargar la transcripción');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadTranscript(referenceId: string): Promise<void> {
    if (this.isLoadingTranscript()) return;

    this.isLoadingTranscript.set(true);
    try {
      const transcriptData = await this.transcriptionsService.getJobTranscriptData(referenceId);
      this.applyTranscriptResponse(transcriptData);
    } catch (error) {
      console.error('Error loading transcript:', error);
      this.error.set('Error al cargar el texto de la transcripción');
    } finally {
      this.isLoadingTranscript.set(false);
    }
  }

  setTranscriptMode(mode: 'original' | 'edited'): void {
    if (mode === 'edited' && !this.hasTranscript()) {
      this.toast.info('No hay transcripción original para editar.');
      return;
    }
    this.transcriptMode.set(mode);
  }

  onEditedTranscriptInput(event: Event): void {
    const nextValue = (event.target as HTMLTextAreaElement).value;
    this.editedTranscript.set(nextValue);
    this.saveStatus.set('idle');
    this.scheduleAutosave();
  }

  async saveEditsManually(): Promise<void> {
    const saved = await this.persistEditedTranscript();
    if (saved) {
      this.toast.success('Cambios guardados.');
    } else {
      this.toast.error('No se pudieron guardar los cambios.');
    }
  }

  restoreEditedFromOriginal(): void {
    this.setEditedTranscriptResults(cloneTranscriptResults(this.originalTranscriptResults()));
    this.saveStatus.set('idle');
    this.toast.info('Se restauró el texto original en la versión editable.');
  }

  startTokenEdit(index: number): void {
    const result = this.editedTranscriptResults()[index];
    if (!result || isDeletedResult(result)) {
      return;
    }

    this.editingTokenIndex.set(index);
    this.editingTokenValue.set(getResultContent(result));
  }

  onTokenEditInput(event: Event): void {
    this.editingTokenValue.set((event.target as HTMLInputElement).value);
  }

  commitTokenEdit(): void {
    const index = this.editingTokenIndex();
    const nextContent = this.editingTokenValue().trim();

    if (index === null || !nextContent) {
      this.cancelTokenEdit();
      return;
    }

    this.setEditedTranscriptResults(updateResultContent(this.editedTranscriptResults(), index, nextContent));
    this.cancelTokenEdit();
    this.markEditedTranscriptDirty();
  }

  cancelTokenEdit(): void {
    this.editingTokenIndex.set(null);
    this.editingTokenValue.set('');
  }

  insertTokenAfter(index: number): void {
    this.setEditedTranscriptResults(insertResultAfter(this.editedTranscriptResults(), index, 'nueva'));
    this.markEditedTranscriptDirty();
  }

  deleteToken(index: number): void {
    this.setEditedTranscriptResults(softDeleteResult(this.editedTranscriptResults(), index));
    this.markEditedTranscriptDirty();
  }

  restoreToken(index: number): void {
    this.setEditedTranscriptResults(restoreResult(this.editedTranscriptResults(), index));
    this.markEditedTranscriptDirty();
  }

  toggleDeletedTokens(): void {
    this.showDeletedTokens.update((value) => !value);
  }

  tokenContent(result: EditableTranscriptResult): string {
    return getResultContent(result);
  }

  tokenClasses(result: EditableTranscriptResult): string {
    const base = 'inline-flex items-center rounded px-1.5 py-1 text-sm leading-6 transition';

    if (result.edit?.status === 'deleted') {
      return `${base} bg-red-50 text-red-500 line-through border border-red-100`;
    }

    if (result.edit?.status === 'inserted') {
      return `${base} bg-blue-50 text-blue-800 border border-blue-200`;
    }

    if (result.edit?.status === 'modified') {
      return `${base} bg-violet-50 text-violet-800 border border-violet-200`;
    }

    const confidence = result.alternatives?.[0]?.confidence;
    if (typeof confidence === 'number' && confidence < 0.75) {
      return `${base} bg-amber-50 text-amber-900 border border-amber-200`;
    }

    return `${base} text-gray-800 hover:bg-gray-100`;
  }

  goBack(): void {
    this.navigation.navigate('/dashboard/transcriptions');
  }

  formatFileSize(bytes: string | number): string {
    return this.transcriptionsService.formatFileSize(bytes);
  }

  formatDuration(seconds: number): string {
    return this.transcriptionsService.formatDuration(seconds);
  }

  getStatusName(statusId: number): string {
    return this.transcriptionsService.getStatusName(statusId);
  }

  getLanguageName(languageCode: string): string {
    return this.transcriptionsService.getLanguageName(languageCode);
  }

  copyTranscript(): void {
    const transcriptText = this.activeTranscript();
    if (transcriptText) {
      navigator.clipboard.writeText(transcriptText).then(() => {
        this.toast.success('Texto copiado al portapapeles.');
      }).catch(err => {
        console.error('Error al copiar:', err);
        this.toast.error('No pudimos copiar el texto. Intenta de nuevo.');
      });
      return;
    }

    this.toast.info('Aún no hay texto disponible para copiar.');
  }

  downloadTranscript(): void {
    const transcriptText = this.activeTranscript();
    const job = this.job();
    if (transcriptText && job) {
      const blob = new Blob([transcriptText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.title || job.originalFilename || 'transcripcion'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.toast.success('Descarga iniciada correctamente.');
      return;
    }

    this.toast.info('Aún no hay una transcripción lista para descargar.');
  }

  /**
   * Refresh job status and reload data
   */
  async refreshJob(): Promise<void> {
    const job = this.job();
    if (job) {
      await this.loadJob(job.id);
      if (this.error()) {
        this.toast.error('No pudimos actualizar el estado.');
      } else {
        this.toast.success('Estado actualizado correctamente.');
      }
    }
  }

  private async loadTranscriptIfNeeded(job: TranscriptionJob): Promise<void> {
    let transcriptText = '';

    if (this.hydrateTranscriptFromJob(job)) {
      transcriptText = this.transcript();
    } else if (job.statusId === 3 && job.referenceId) {
      await this.loadTranscript(job.referenceId);
      transcriptText = this.transcript();
    } else {
      this.transcript.set('');
    }

    this.initializeEditableTranscript(job, transcriptText);
  }

  private hydrateTranscriptFromJob(job: TranscriptionJob): boolean {
    this.hydrateInsightsFromMetadata(job.metadata);

    const metadataTranscript = this.extractTranscriptFromMetadata(job.metadata);
    if (metadataTranscript) {
      this.transcript.set(metadataTranscript);
      return true;
    }

    if (typeof job.transcriptionText === 'string' && job.transcriptionText.trim().length > 0) {
      this.transcript.set(job.transcriptionText);
      return true;
    }

    return false;
  }

  private hydrateInsightsFromMetadata(metadata: Record<string, unknown> | null): void {
    if (!metadata || typeof metadata !== 'object') {
      return;
    }

    const rawSummary = metadata['summary'] as { content?: string } | undefined;
    this.summaryContent.set(typeof rawSummary?.content === 'string' ? rawSummary.content.trim() : '');

    const rawTranslations = metadata['translations'];
    if (rawTranslations && typeof rawTranslations === 'object') {
      this.translationsMap.set(rawTranslations as Record<string, TranscriptTranslationSegment[]>);
    }

    const rawMetadata = metadata['metadata'] as Record<string, unknown> | undefined;
    const translationErrors = this.extractFeatureErrors(metadata, rawMetadata, 'translation_errors');
    const summarizationErrors = this.extractFeatureErrors(metadata, rawMetadata, 'summarization_errors');

    this.translationErrors.set(translationErrors);
    this.summarizationErrors.set(summarizationErrors);
  }

  private extractFeatureErrors(
    metadata: Record<string, unknown>,
    nestedMetadata: Record<string, unknown> | undefined,
    key: 'translation_errors' | 'summarization_errors',
  ): TranscriptFeatureError[] {
    if (Array.isArray(metadata[key])) {
      return metadata[key] as TranscriptFeatureError[];
    }

    if (Array.isArray(nestedMetadata?.[key])) {
      return nestedMetadata[key] as TranscriptFeatureError[];
    }

    return [];
  }

  private extractTranscriptFromMetadata(metadata: Record<string, unknown> | null): string {
    if (!metadata || typeof metadata !== 'object') {
      return '';
    }

    const rawResults = metadata['results'];
    if (!Array.isArray(rawResults)) {
      return '';
    }

    const results = rawResults as TranscriptResult[];
    this.originalTranscriptResults.set(cloneTranscriptResults(results));
    return composeTranscriptFromResults(results);
  }

  private applyTranscriptResponse(transcriptData: TranscriptResponse): void {
    const results = transcriptData.results ?? [];
    const transcriptText = composeTranscriptFromResults(results);
    this.originalTranscriptResults.set(cloneTranscriptResults(results));
    this.transcript.set(transcriptText);
    this.summaryContent.set(transcriptData.summary?.content?.trim() ?? '');
    this.translationsMap.set(transcriptData.translations ?? {});
    this.translationErrors.set(transcriptData.metadata?.translation_errors ?? []);
    this.summarizationErrors.set(transcriptData.metadata?.summarization_errors ?? []);
  }

  getTranslationDisplay(code: string): string {
    const segments = this.translationsMap()[code] ?? [];
    return segments.map((segment) => segment.content).join(' ').replace(/\s+/g, ' ').trim();
  }

  private initializeEditableTranscript(job: TranscriptionJob, originalText: string): void {
    const backendResults = job.editedTranscript?.results;
    const editableResults = Array.isArray(backendResults) && backendResults.length > 0
      ? cloneTranscriptResults(backendResults)
      : cloneTranscriptResults(this.originalTranscriptResults());

    this.setEditedTranscriptResults(editableResults);
    this.savedEditedTranscriptSnapshot.set(serializeTranscriptResults(editableResults));
    this.editedTranscript.set(composeTranscriptFromResults(editableResults) || originalText);
    this.lastSavedAt.set(null);
    this.saveStatus.set('idle');
  }

  private scheduleAutosave(): void {
    // TODO(FE-ST-003): Respect editorDefaults.autosaveEnabled and show "Cambios sin guardar" when disabled.
    this.clearAutosaveTimeout();
    this.autosaveTimeout = setTimeout(() => {
      void this.persistEditedTranscript();
    }, this.AUTOSAVE_DEBOUNCE_MS);
  }

  private async persistEditedTranscript(): Promise<boolean> {
    const currentJob = this.job();
    if (!currentJob) {
      return false;
    }

    this.saveStatus.set('saving');

    try {
      await this.transcriptionsService.saveEditedTranscript(currentJob.id, {
        editedTranscript: {
          results: this.editedTranscriptResults(),
        },
      });
      this.savedEditedTranscriptSnapshot.set(serializeTranscriptResults(this.editedTranscriptResults()));
      this.lastSavedAt.set(Date.now());
      this.saveStatus.set('saved');
      return true;
    } catch (error) {
      console.error('Error saving edited transcript:', error);
      this.saveStatus.set('error');
      return false;
    }
  }

  private persistDraft(): boolean {
    const currentJob = this.job();
    if (!currentJob) {
      return false;
    }

    try {
      const savedDraft = this.draftService.save(currentJob.id, this.transcript(), this.editedTranscript());
      this.lastSavedAt.set(savedDraft.updatedAt);
      this.saveStatus.set('saved');
      return true;
    } catch {
      this.saveStatus.set('error');
      return false;
    }
  }

  private setEditedTranscriptResults(results: EditableTranscriptResult[]): void {
    this.editedTranscriptResults.set(results);
    this.editedTranscript.set(composeTranscriptFromResults(results));
  }

  private markEditedTranscriptDirty(): void {
    this.saveStatus.set('idle');
    this.scheduleAutosave();
  }

  private clearAutosaveTimeout(): void {
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
      this.autosaveTimeout = null;
    }
  }

  private resetTranscriptState(): void {
    this.clearAutosaveTimeout();
    this.transcriptMode.set('original');
    this.transcript.set('');
    this.editedTranscript.set('');
    this.originalTranscriptResults.set([]);
    this.editedTranscriptResults.set([]);
    this.savedEditedTranscriptSnapshot.set('');
    this.editingTokenIndex.set(null);
    this.editingTokenValue.set('');
    this.showDeletedTokens.set(false);
    this.summaryContent.set('');
    this.translationsMap.set({});
    this.translationErrors.set([]);
    this.summarizationErrors.set([]);
    this.saveStatus.set('idle');
    this.lastSavedAt.set(null);
  }

  /**
   * Cancel a pending transcription job
   */
  cancelJob(): void {
    if (this.job()) {
      this.showCancelModal.set(true);
    }
  }

  /**
   * Edit transcription title
   */
  editTitle(): void {
    const job = this.job();
    if (job) {
      this.editTitleValue.set(job.title || '');
      this.showEditTitleModal.set(true);
    }
  }

  /**
   * Delete transcription job
   */
  deleteJob(): void {
    if (this.job()) {
      this.showDeleteModal.set(true);
    }
  }

  onCloseCancelModal(): void {
    this.showCancelModal.set(false);
  }

  onCloseDeleteModal(): void {
    this.showDeleteModal.set(false);
  }

  onCloseEditTitleModal(): void {
    this.showEditTitleModal.set(false);
  }

  onEditTitleInput(event: Event): void {
    const nextTitle = (event.target as HTMLInputElement).value;
    this.editTitleValue.set(nextTitle);
  }

  async onConfirmCancel(): Promise<void> {
    const currentJob = this.job();

    if (!currentJob) {
      this.showCancelModal.set(false);
      return;
    }

    try {
      const canceledJob = await this.transcriptionsService.cancelJob(currentJob.id);
      this.job.set(canceledJob);
      this.showCancelModal.set(false);
      this.toast.success('Transcripción cancelada.');
    } catch (error) {
      console.error('Error canceling job:', error);
      this.toast.error('No pudimos cancelar la transcripción.');
    }
  }

  async onConfirmDelete(): Promise<void> {
    const currentJob = this.job();

    if (!currentJob) {
      this.showDeleteModal.set(false);
      return;
    }

    try {
      await this.transcriptionsService.deleteJob(currentJob.id);
      this.showDeleteModal.set(false);
      this.toast.success('Transcripción eliminada.');
      this.goBack();
    } catch (error) {
      console.error('Error deleting job:', error);
      this.toast.error('No pudimos eliminar la transcripción.');
    }
  }

  async onConfirmEditTitle(): Promise<void> {
    const currentJob = this.job();
    const nextTitle = this.editTitleValue().trim();

    if (!currentJob) {
      this.showEditTitleModal.set(false);
      return;
    }

    if (!nextTitle) {
      this.toast.error('El título no puede estar vacío.');
      return;
    }

    if (nextTitle === currentJob.title) {
      this.showEditTitleModal.set(false);
      return;
    }

    try {
      const updatedJob = await this.transcriptionsService.updateJobTitle(currentJob.id, nextTitle);
      this.job.set(updatedJob);
      this.showEditTitleModal.set(false);
      this.toast.success('Título actualizado.');
    } catch (error) {
      console.error('Error updating title:', error);
      this.toast.error('No pudimos actualizar el título.');
    }
  }
}
