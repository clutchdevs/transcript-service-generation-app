import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService } from '../toast/toast';
import { TranscriptionJob } from '../transcriptions/transcriptions.types';
import { RealtimeTranscriptionsService } from './realtime-transcriptions';
import { TranscriptionPollingFallbackService } from './transcription-polling-fallback';
import { TranscriptionRealtimeEvent, TranscriptionRealtimeStatus } from './transcription-events.types';

@Injectable({ providedIn: 'root' })
export class TranscriptionEventsCoordinatorService implements OnDestroy {
  private realtime = inject(RealtimeTranscriptionsService);
  private pollingFallback = inject(TranscriptionPollingFallbackService);
  private toast = inject(ToastService);
  private subscriptions: Subscription[] = [];
  private activeUserId: string | null = null;
  private seenEventKeys = new Set<string>();

  readonly lastEvent = signal<TranscriptionRealtimeEvent | null>(null);
  readonly fallbackActive = signal(false);
  readonly realtimeStatus = computed<TranscriptionRealtimeStatus>(() => this.realtime.status());

  constructor() {
    this.subscriptions.push(
      this.realtime.events$.subscribe((event) => this.handleEvent(event)),
      this.pollingFallback.events$.subscribe((event) => this.handleEvent(event)),
    );
  }

  ngOnDestroy(): void {
    this.stop();
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];
  }

  async start(userId: string): Promise<void> {
    if (this.activeUserId === userId) {
      console.debug('[Events] start skipped, already active', { userId });
      return;
    }

    console.debug('[Events] start', { userId });
    this.stop();
    this.activeUserId = userId;
    const result = await this.realtime.connect(userId);
    console.debug('[Events] realtime result', { result, status: this.realtimeStatus() });

    if (result === 'unavailable' || result === 'error') {
      this.fallbackActive.set(true);
      return;
    }

    this.fallbackActive.set(false);
  }

  stop(): void {
    if (this.activeUserId) {
      console.debug('[Events] stop', { userId: this.activeUserId });
    }
    this.realtime.disconnect();
    this.pollingFallback.stop();
    this.activeUserId = null;
    this.fallbackActive.set(false);
    this.seenEventKeys.clear();
  }

  ensurePollingFallbackForPendingJobs(): void {
    if (!this.fallbackActive() || !this.activeUserId) {
      console.debug('[Events] polling fallback not active', {
        fallbackActive: this.fallbackActive(),
        activeUserId: this.activeUserId,
      });
      return;
    }

    console.debug('[Events] ensure polling fallback', { userId: this.activeUserId });
    this.pollingFallback.start(this.activeUserId);
  }

  seedPollingFallbackJobs(jobs: TranscriptionJob[]): void {
    if (!this.fallbackActive()) {
      return;
    }

    this.pollingFallback.seedKnownJobs(jobs);
  }

  private handleEvent(event: TranscriptionRealtimeEvent): void {
    const eventKey = `${event.type}:${event.jobId}:${event.transcriptionId ?? ''}`;
    if (this.seenEventKeys.has(eventKey)) {
      console.debug('[Events] duplicate ignored', { eventKey, event });
      return;
    }

    console.debug('[Events] event received', event);
    this.seenEventKeys.add(eventKey);
    this.lastEvent.set(event);

    if (event.type === 'completed') {
      this.toast.success(`Transcripción completada${event.title ? `: ${event.title}` : ''}.`);
      return;
    }

    if (event.type === 'failed') {
      this.toast.error(`La transcripción falló${event.title ? `: ${event.title}` : ''}.`);
    }
  }
}
