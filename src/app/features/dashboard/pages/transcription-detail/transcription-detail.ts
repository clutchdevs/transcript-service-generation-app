import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Button } from '../../../../shared/components/ui/button/button';
import { Modal } from '../../../../shared/components/ui/modal/modal';
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transcriptionsService = inject(TranscriptionsService);
  private navigation = inject(NavigationService);
  private auth = inject(Auth);
  private destroy$ = new Subject<void>();

  // Signals para el estado
  readonly job = signal<TranscriptionJob | null>(null);
  readonly transcript = signal<string>('');
  readonly isLoading = signal(false);
  readonly isLoadingTranscript = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly showCancelModal = signal(false);
  readonly showRetryModal = signal(false);
  readonly showDeleteModal = signal(false);
  readonly showEditTitleModal = signal(false);
  readonly editTitleValue = signal('');

  // Computed signals
  readonly hasTranscript = computed(() => !!this.transcript() && this.transcript().length > 0);
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadJob(jobId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.transcript.set('');

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
    const transcriptText = this.transcript();
    if (transcriptText) {
      navigator.clipboard.writeText(transcriptText).then(() => {
        // Podrías mostrar un toast aquí
        console.log('Transcripción copiada al portapapeles');
      }).catch(err => {
        console.error('Error al copiar:', err);
      });
    }
  }

  downloadTranscript(): void {
    const transcriptText = this.transcript();
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
    }
  }

  /**
   * Refresh job status and reload data
   */
  async refreshJob(): Promise<void> {
    const job = this.job();
    if (job) {
      await this.loadJob(job.id);
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
    if (this.hydrateTranscriptFromJob(job)) {
      return;
    }

    if (job.statusId === 3 && job.referenceId) {
      await this.loadTranscript(job.referenceId);
      return;
    }

    this.transcript.set('');
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
    this.notice.set('La cancelación quedará habilitada cuando el backend exponga el endpoint.');
  }

  onConfirmRetry(): void {
    this.showRetryModal.set(false);
    this.notice.set('El reintento quedará habilitado cuando el backend exponga el endpoint.');
  }

  onConfirmDelete(): void {
    this.showDeleteModal.set(false);
    this.notice.set('La eliminación quedará habilitada cuando el backend exponga el endpoint.');
  }

  onConfirmEditTitle(): void {
    const currentJob = this.job();
    const nextTitle = this.editTitleValue().trim();

    if (!currentJob) {
      this.showEditTitleModal.set(false);
      return;
    }

    if (!nextTitle) {
      this.notice.set('El título no puede estar vacío.');
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
    this.notice.set('Título actualizado localmente. Se persistirá cuando exista endpoint de edición.');
  }

  clearNotice(): void {
    this.notice.set(null);
  }
}
