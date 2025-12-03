import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Button } from '../../../../shared/components/ui/button/button';
import { Transcriptions as TranscriptionsService } from '../../../../core/services/transcriptions/transcriptions';
import { TranscriptionJob } from '../../../../core/services/transcriptions/transcriptions.types';
import { NavigationService } from '../../../../core/services/navigation/navigation';
import { Auth } from '../../../../core/services/auth/auth';

@Component({
  selector: 'app-transcription-detail',
  standalone: true,
  imports: [CommonModule, Button],
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

  // Computed signals
  readonly hasTranscript = computed(() => !!this.transcript() && this.transcript().length > 0);
  readonly isCompleted = computed(() => this.job()?.statusId === 3);
  readonly isPending = computed(() => this.job()?.statusId === 2);
  readonly hasError = computed(() => this.job()?.statusId === 4);

  ngOnInit(): void {
    // Obtener el ID de la ruta
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const jobId = params['id'];
        if (jobId) {
          this.loadJob(jobId);
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

      // Si la transcripción está completada, cargar el texto
      if (foundJob.statusId === 3 && foundJob.referenceId) {
        await this.loadTranscript(foundJob.referenceId);
      } else if (foundJob.transcriptionText) {
        // Si ya tiene el texto en el job, usarlo
        this.transcript.set(foundJob.transcriptionText);
      }
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
}

