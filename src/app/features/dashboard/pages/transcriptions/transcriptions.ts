import { Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from '../../../../shared/components/ui/button/button';
import { Transcriptions as TranscriptionsService, TranscriptionJob } from '../../../../core/services/transcriptions/transcriptions';
import { Auth } from '../../../../core/services/auth/auth';
import { NavigationService, ROUTES } from '../../../../core/services/navigation/navigation';

@Component({
  selector: 'app-transcriptions',
  imports: [Button, DatePipe],
  templateUrl: './transcriptions.html',
  styleUrl: './transcriptions.scss'
})
export class Transcriptions {
  private transcriptions = inject(TranscriptionsService);
  private auth = inject(Auth);
  private navigation = inject(NavigationService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly jobs = signal<TranscriptionJob[]>([]);

  constructor() {
    effect(async () => {
      const user = this.auth.user();
      if (!user) {
        this.jobs.set([]);
        return;
      }

      this.isLoading.set(true);
      this.error.set(null);
      try {
        const data = await this.transcriptions.listUserJobs(user.id);
        this.jobs.set(data);
      } catch (e: unknown) {
        const message = (e as { message?: string })?.message || 'No se pudieron cargar las transcripciones';
        this.error.set(message);
        this.jobs.set([]);
      } finally {
        this.isLoading.set(false);
      }
    });
  }

  goToNew(): void {
    this.navigation.navigate(ROUTES.DASHBOARD.ROOT + '/new');
  }
}
