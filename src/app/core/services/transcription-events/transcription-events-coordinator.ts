import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService } from '../toast/toast';
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
      return;
    }

    this.stop();
    this.activeUserId = userId;
    const result = await this.realtime.connect(userId);

    if (result === 'unavailable') {
      this.fallbackActive.set(true);
      this.pollingFallback.start(userId);
      return;
    }

    this.fallbackActive.set(false);
  }

  stop(): void {
    this.realtime.disconnect();
    this.pollingFallback.stop();
    this.activeUserId = null;
    this.fallbackActive.set(false);
    this.seenEventKeys.clear();
  }

  ensurePollingFallbackForPendingJobs(): void {
    if (!this.fallbackActive() || !this.activeUserId) {
      return;
    }

    this.pollingFallback.start(this.activeUserId);
  }

  private handleEvent(event: TranscriptionRealtimeEvent): void {
    const eventKey = `${event.type}:${event.jobId}:${event.transcriptionId ?? ''}`;
    if (this.seenEventKeys.has(eventKey)) {
      return;
    }

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
