import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Button } from '../../../../shared/components/ui/button/button';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { ToastService } from '../../../../core/services/toast/toast';
import { TranscriptionDraftService } from '../../../../core/services/transcription-draft/transcription-draft';
import { Transcriptions as TranscriptionsService } from '../../../../core/services/transcriptions/transcriptions';
import { TranscriptionJob } from '../../../../core/services/transcriptions/transcriptions.types';
import { NavigationService } from '../../../../core/services/navigation/navigation';
import { Auth } from '../../../../core/services/auth/auth';

interface TranscriptResultLike {
  type?: 'word' | 'punctuation' | string;
  attaches_to?: 'previous' | 'next' | string;
  alternatives?: Array<{ content?: string }>;
}

@Component({
  selector: 'app-transcription-detail',
  standalone: true,
  imports: [CommonModule, Button, Modal],
  templateUrl: './transcription-detail.html',
  styleUrl: './transcription-detail.scss'
})
export class TranscriptionDetail implements OnInit, OnDestroy {
  private readonly AUTOSAVE_DEBOUNCE_MS = 1500;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transcriptionsService = inject(TranscriptionsService);
  private navigation = inject(NavigationService);
  private auth = inject(Auth);
  private toast = inject(ToastService);
  private draftService = inject(TranscriptionDraftService);
  private destroy$ = new Subject<void>();
  private autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Signals para el estado
  readonly job = signal<TranscriptionJob | null>(null);
  readonly transcript = signal<string>('');
  readonly editedTranscript = signal<string>('');
  readonly transcriptMode = signal<'original' | 'edited'>('original');
  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly lastSavedAt = signal<number | null>(null);
  readonly isLoading = signal(false);
  readonly isLoadingTranscript = signal(false);
  readonly error = signal<string | null>(null);

  readonly showCancelModal = signal(false);
  readonly showRetryModal = signal(false);
  readonly showDeleteModal = signal(false);
  readonly showEditTitleModal = signal(false);
  readonly editTitleValue = signal('');

  // Computed signals
  readonly hasTranscript = computed(() => !!this.transcript() && this.transcript().length > 0);
  readonly activeTranscript = computed(() => this.transcriptMode() === 'edited' ? this.editedTranscript() : this.transcript());
  readonly hasUnsavedChanges = computed(() => this.editedTranscript() !== this.transcript());
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
  readonly isCompleted = computed(() => this.job()?.statusId === 3);
  readonly isPending = computed(() => this.job()?.statusId === 2);
  readonly hasError = computed(() => this.job()?.statusId === 4);

  ngOnInit(): void {
    // Obtener el ID de la ruta
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(async params => {
        const jobId = params['id'];
        if (jobId) {
          this.resetTranscriptState();
          const stateJob = this.getJobFromNavigationState(jobId);

          if (stateJob) {
            this.error.set(null);
            this.isLoading.set(false);
            this.job.set(stateJob);
            await this.loadTranscriptIfNeeded(stateJob);
            return;
          }

          await this.loadJob(jobId);
        } else {
          this.error.set('ID de transcripción no válido');
        }
      });
  }

  ngOnDestroy(): void {
    this.clearAutosaveTimeout();
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadJob(jobId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.resetTranscriptState();

    try {
      // Obtener el usuario actual para cargar los jobs
      const user = this.auth.user();
      if (!user?.id) {
        this.error.set('Usuario no autenticado');
        this.navigation.goToDashboard();
        return;
      }

      // Cargar todos los jobs del usuario y buscar el que coincide
      const jobs = await this.transcriptionsService.listUserJobs(user.id);
      const foundJob = jobs.find(job => job.id === jobId || job.referenceId === jobId);

      if (!foundJob) {
        this.error.set('Transcripción no encontrada');
        return;
      }

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
      const transcriptText = await this.transcriptionsService.getJobTranscript(referenceId);
      this.transcript.set(transcriptText);
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

  saveEditsManually(): void {
    const saved = this.persistDraft();
    if (saved) {
      this.toast.success('Cambios guardados.');
    } else {
      this.toast.error('No se pudieron guardar los cambios.');
    }
  }

  restoreEditedFromOriginal(): void {
    this.editedTranscript.set(this.transcript());
    const saved = this.persistDraft();
    if (saved) {
      this.toast.info('Se restauró el texto original en la versión editable.');
    } else {
      this.toast.error('No se pudo restaurar el texto editable.');
    }
  }

  goBack(): void {
    this.navigation.navigate('/dashboard/transcriptions');
  }

  formatFileSize(bytes: string): string {
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

  private getJobFromNavigationState(jobId: string): TranscriptionJob | null {
    const navigationState = this.router.getCurrentNavigation()?.extras?.state?.['job'] as TranscriptionJob | undefined;
    const historyStateJob = (history.state as { job?: TranscriptionJob } | null)?.job;
    const candidate = navigationState ?? historyStateJob;

    if (!candidate) {
      return null;
    }

    if (candidate.id === jobId || candidate.referenceId === jobId) {
      return candidate;
    }

    return null;
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
    if (typeof job.transcriptionText === 'string' && job.transcriptionText.trim().length > 0) {
      this.transcript.set(job.transcriptionText);
      return true;
    }

    const metadataTranscript = this.extractTranscriptFromMetadata(job.metadata);
    if (metadataTranscript) {
      this.transcript.set(metadataTranscript);
      return true;
    }

    return false;
  }

  private extractTranscriptFromMetadata(metadata: Record<string, unknown> | null): string {
    if (!metadata || typeof metadata !== 'object') {
      return '';
    }

    const rawResults = metadata['results'];
    if (!Array.isArray(rawResults)) {
      return '';
    }

    return this.composeTranscriptFromResults(rawResults as TranscriptResultLike[]);
  }

  private composeTranscriptFromResults(results: TranscriptResultLike[]): string {
    let text = '';

    for (const result of results) {
      const content = result.alternatives?.[0]?.content;
      if (!content) {
        continue;
      }

      if (result.type === 'punctuation' && result.attaches_to === 'previous') {
        text += content;
        continue;
      }

      if (text.length > 0 && !text.endsWith(' ')) {
        text += ' ';
      }
      text += content;
    }

    return text.trim();
  }

  private initializeEditableTranscript(job: TranscriptionJob, originalText: string): void {
    const draft = this.draftService.load(job.id);

    if (draft) {
      this.editedTranscript.set(draft.editedText);
      this.lastSavedAt.set(draft.updatedAt);
      this.saveStatus.set('saved');
      return;
    }

    this.editedTranscript.set(originalText);
    this.lastSavedAt.set(null);
    this.saveStatus.set('idle');
  }

  private scheduleAutosave(): void {
    this.clearAutosaveTimeout();
    this.autosaveTimeout = setTimeout(() => {
      this.persistDraft();
    }, this.AUTOSAVE_DEBOUNCE_MS);
  }

  private persistDraft(): boolean {
    const currentJob = this.job();
    if (!currentJob) {
      return false;
    }

    this.saveStatus.set('saving');

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
   * Retry a failed transcription job
   */
  retryJob(): void {
    if (this.job()) {
      this.showRetryModal.set(true);
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

  onCloseRetryModal(): void {
    this.showRetryModal.set(false);
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

  onConfirmCancel(): void {
    this.showCancelModal.set(false);
    this.toast.info('La opción de cancelar estará disponible cuando backend habilite el endpoint.');
  }

  onConfirmRetry(): void {
    this.showRetryModal.set(false);
    this.toast.info('La opción de reintento estará disponible cuando backend habilite el endpoint.');
  }

  onConfirmDelete(): void {
    this.showDeleteModal.set(false);
    this.toast.info('La eliminación estará disponible cuando backend habilite el endpoint.');
  }

  onConfirmEditTitle(): void {
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

    this.job.update((job) => {
      if (!job) {
        return job;
      }
      return {
        ...job,
        title: nextTitle
      };
    });

    this.showEditTitleModal.set(false);
    this.toast.success('Título actualizado localmente. Se guardará en servidor cuando exista el endpoint.');
  }
}
