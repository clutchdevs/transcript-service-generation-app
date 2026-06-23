import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';

import { Button } from '../../../../shared/components/ui/button/button';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { TranscriptionsFilters } from './components/transcriptions-filters/transcriptions-filters';
import { TranscriptionsTable } from './components/transcriptions-table/transcriptions-table';
import { Transcriptions as TranscriptionsService } from '../../../../core/services/transcriptions/transcriptions';
import { TranscriptionJob } from '../../../../core/services/transcriptions/transcriptions.types';
import { Auth } from '../../../../core/services/auth/auth';
import { NavigationService, ROUTES } from '../../../../core/services/navigation/navigation';
import { TranscriptionEventsCoordinatorService } from '../../../../core/services/transcription-events/transcription-events-coordinator';
import { LANGUAGES } from '../../../../core/integrations/speechmatics/constants';
import { SelectOption } from '../../../../shared/components/ui/select/select';
import { Router } from '@angular/router';
import { ToastService } from '../../../../core/services/toast/toast';

@Component({
  selector: 'app-transcriptions',
  imports: [Button, Modal, TranscriptionsFilters, TranscriptionsTable],
  templateUrl: './transcriptions.html',
  styleUrl: './transcriptions.scss'
})
export class Transcriptions implements OnInit {
  private transcriptionsService = inject(TranscriptionsService);
  private auth = inject(Auth);
  private navigation = inject(NavigationService);
  private router = inject(Router);
  private transcriptionEvents = inject(TranscriptionEventsCoordinatorService);
  private toast = inject(ToastService);

  // Signals para el estado
  readonly jobs = signal<TranscriptionJob[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<string>('all');
  readonly languageFilter = signal<string>('all');
  private hasLoadedInitialData = false;
  private lastHandledRealtimeEventKey: string | null = null;

  // Modal de confirmación
  readonly showDeleteModal = signal(false);
  readonly jobToDelete = signal<TranscriptionJob | null>(null);

  // Opciones para los selects
  readonly statusOptions: SelectOption[] = [
    { label: 'Todos los estados', value: 'all' },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Completado', value: 'completado' },
    { label: 'Error', value: 'error' },
    { label: 'Cancelado', value: 'cancelado' }
  ];

  readonly languageOptions: SelectOption[] = [
    { label: 'Todos los idiomas', value: 'all' },
    ...LANGUAGES.map(lang => ({ label: lang.label, value: lang.value }))
  ];

  // Computed signals
  readonly user = computed(() => this.auth.user());
  readonly filteredJobs = computed(() => {
    const jobs = this.jobs();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const language = this.languageFilter();

    // Si no hay jobs cargados, retornar array vacío
    if (!jobs || jobs.length === 0) {
      return [];
    }

    return jobs.filter(job => {
      const matchesSearch = !search ||
        job.title.toLowerCase().includes(search) ||
        job.originalFilename.toLowerCase().includes(search);

      const statusName = this.transcriptionsService.getStatusName(job.statusId);
      const matchesStatus = status === 'all' ||
        statusName.toLowerCase() === status.toLowerCase();

      const matchesLanguage = language === 'all' || job.language === language;

      return matchesSearch && matchesStatus && matchesLanguage;
    });
  });

  constructor() {
    // Usar effect para cargar datos cuando el usuario esté disponible
    effect(() => {
      const user = this.user();
      if (user?.id && !this.hasLoadedInitialData && !this.isLoading()) {
        console.log('User available, loading jobs for:', user.id);
        this.loadJobs();
      }
    });

    effect(() => {
      const event = this.transcriptionEvents.lastEvent();
      if (!event) {
        return;
      }

      const eventKey = `${event.type}:${event.jobId}:${event.transcriptionId ?? ''}`;
      if (event.type !== 'updated' && this.lastHandledRealtimeEventKey === eventKey) {
        return;
      }
      if (event.type !== 'updated') {
        this.lastHandledRealtimeEventKey = eventKey;
      }

      console.debug('[Transcriptions] realtime event received', event);

      if (event.type === 'deleted') {
        console.debug('[Transcriptions] removing deleted job from table', { jobId: event.jobId });
        this.jobs.update((jobs) => jobs.filter((job) => job.id !== event.jobId));
        return;
      }

      console.debug('[Transcriptions] refreshing jobs after realtime event', event);
      this.refreshJobs();
    });
  }

  ngOnInit(): void {
    // Cargar jobs si el usuario ya está disponible
    const user = this.user();
    if (user?.id && !this.hasLoadedInitialData && !this.isLoading()) {
      this.loadJobs();
    }
  }

  async loadJobs(): Promise<void> {
    const user = this.user();
    if (!user?.id) {
      console.warn('No user ID available');
      return;
    }

    // Evitar cargas múltiples
    if (this.isLoading()) {
      console.log('Already loading jobs, skipping...');
      return;
    }

    console.log('Loading jobs for user:', user.id);
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const jobs = await this.transcriptionsService.listUserJobs(user.id);
      console.log('Jobs loaded:', jobs);
      console.debug('[Transcriptions] jobs refreshed', jobs.map((job) => ({
        id: job.id,
        referenceId: job.referenceId,
        statusId: job.statusId,
        title: job.title,
      })));
      this.jobs.set(jobs);
      if (jobs.some((job) => job.statusId === 2)) {
        this.transcriptionEvents.ensurePollingFallbackForPendingJobs(jobs);
      } else {
        this.transcriptionEvents.seedPollingFallbackJobs(jobs);
      }
      this.hasLoadedInitialData = true; // Marcar que ya se cargaron los datos iniciales
    } catch (error) {
      console.error('Error loading jobs:', error);
      this.error.set('Error al cargar las transcripciones');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onStatusFilterChange(value: string | number): void {
    this.statusFilter.set(String(value));
  }

  onLanguageFilterChange(value: string | number): void {
    this.languageFilter.set(String(value));
  }

  goToNew(): void {
    this.navigation.navigate(ROUTES.DASHBOARD.ROOT + '/new');
  }

  viewJob(job: TranscriptionJob): void {
    this.router.navigate(['/dashboard/transcriptions', job.id], {
      state: { job }
    });
  }

  editJob(job: TranscriptionJob): void {
    console.log('Edit job:', job);
    // TODO: Implementar edición de transcripción
  }

  deleteJob(job: TranscriptionJob): void {
    this.jobToDelete.set(job);
    this.showDeleteModal.set(true);
  }

  async onConfirmDelete(): Promise<void> {
    const job = this.jobToDelete();
    if (job) {
      try {
        await this.transcriptionsService.deleteJob(job.id);
        const currentJobs = this.jobs();
        const updatedJobs = currentJobs.filter(j => j.id !== job.id);
        this.jobs.set(updatedJobs);
        this.toast.success('Transcripción eliminada.');
      } catch (error) {
        console.error('Error deleting job:', error);
        this.toast.error('No pudimos eliminar la transcripción.');
      }
    }
    this.onCloseDeleteModal();
  }

  onCloseDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.jobToDelete.set(null);
  }

  cancelJob(job: TranscriptionJob): void {
    console.log('Cancel job:', job);
    // TODO(FE-JB-003): Wire list-level cancel action if this action returns to the table UI.
  }

  retryJob(job: TranscriptionJob): void {
    console.log('Retry job:', job);
    // TODO(FE-JB-003): Wire retry after BE-105 defines whether retry reuses or creates a job.
  }

  refreshJobs(): void {
    this.hasLoadedInitialData = false;
    this.loadJobs();
  }

}
