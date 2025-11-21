import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../../../shared/components/ui/button/button';
import { Transcriptions as TranscriptionsService, TranscriptionJob } from '../../../../core/services/transcriptions/transcriptions';
import { Auth } from '../../../../core/services/auth/auth';
import { NavigationService, ROUTES } from '../../../../core/services/navigation/navigation';

@Component({
  selector: 'app-transcriptions',
  imports: [CommonModule, Button],
  templateUrl: './transcriptions.html',
  styleUrl: './transcriptions.scss'
})
export class Transcriptions implements OnInit {
  private transcriptionsService = inject(TranscriptionsService);
  private auth = inject(Auth);
  private navigation = inject(NavigationService);

  // Signals para el estado
  readonly jobs = signal<TranscriptionJob[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<string>('all');
  readonly languageFilter = signal<string>('all');
  private hasLoadedInitialData = false;

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
      this.jobs.set(jobs);
      this.hasLoadedInitialData = true; // Marcar que ya se cargaron los datos iniciales
    } catch (error) {
      console.error('Error loading jobs:', error);
      this.error.set('Error al cargar las transcripciones');
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value);
  }

  onLanguageFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.languageFilter.set(target.value);
  }

  goToNew(): void {
    this.navigation.navigate(ROUTES.DASHBOARD.ROOT + '/new');
  }

  async viewJob(job: TranscriptionJob): Promise<void> {
    console.log('View job:', job);
    
    try {
      console.log('Fetching transcript for job:', job.referenceId);
      const transcript = await this.transcriptionsService.getJobTranscript(job.referenceId);
      console.log('Transcript response:', transcript);
    } catch (error) {
      console.error('Error fetching transcript:', error);
    }
  }

  editJob(job: TranscriptionJob): void {
    console.log('Edit job:', job);
    // TODO: Implementar edición de transcripción
  }

  deleteJob(job: TranscriptionJob): void {
    console.log('Delete job:', job);
    // TODO: Implementar eliminación de transcripción
  }

  cancelJob(job: TranscriptionJob): void {
    console.log('Cancel job:', job);
    // TODO: Implementar cancelación de transcripción
  }

  retryJob(job: TranscriptionJob): void {
    console.log('Retry job:', job);
    // TODO: Implementar reintento de transcripción
  }

  refreshJobs(): void {
    this.hasLoadedInitialData = false;
    this.loadJobs();
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
}
