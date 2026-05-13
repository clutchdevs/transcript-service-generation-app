import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { Transcriptions } from '../transcriptions/transcriptions';
import { TranscriptionJob } from '../transcriptions/transcriptions.types';
import { TranscriptionRealtimeEvent } from './transcription-events.types';

@Injectable({ providedIn: 'root' })
export class TranscriptionPollingFallbackService {
  private readonly POLLING_INTERVAL_MS = 15000;
  private transcriptions = inject(Transcriptions);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private knownJobs = new Map<string, TranscriptionJob>();
  private currentUserId: string | null = null;
  private isPolling = false;

  readonly events$ = new Subject<TranscriptionRealtimeEvent>();

  seedKnownJobs(jobs: TranscriptionJob[]): void {
    if (!this.currentUserId) {
      return;
    }

    this.knownJobs = new Map(jobs.map((job) => [job.id, job]));
    console.debug('[PollingFallback] seed known jobs', jobs.map((job) => ({
      id: job.id,
      referenceId: job.referenceId,
      statusId: job.statusId,
    })));
  }

  start(userId: string, initialJobs: TranscriptionJob[] = []): void {
    if (this.currentUserId === userId && this.intervalId) {
      if (initialJobs.length > 0) {
        this.seedKnownJobs(initialJobs);
      }
      console.debug('[PollingFallback] already running', { userId });
      return;
    }

    console.debug('[PollingFallback] start', { userId, intervalMs: this.POLLING_INTERVAL_MS });
    this.stop();
    this.currentUserId = userId;
    if (initialJobs.length > 0) {
      this.seedKnownJobs(initialJobs);
    }
    void this.pollOnce();
    this.intervalId = setInterval(() => void this.pollOnce(), this.POLLING_INTERVAL_MS);
  }

  stop(): void {
    if (this.currentUserId) {
      console.debug('[PollingFallback] stop', { userId: this.currentUserId });
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.knownJobs.clear();
    this.currentUserId = null;
    this.isPolling = false;
  }

  async pollOnce(): Promise<void> {
    if (!this.currentUserId || this.isPolling) {
      return;
    }

    this.isPolling = true;
    try {
      const jobs = await this.transcriptions.listUserJobs(this.currentUserId);
      const hasPendingJobs = jobs.some((job) => job.statusId === 2);
      console.debug('[PollingFallback] poll result', jobs.map((job) => ({
        id: job.id,
        referenceId: job.referenceId,
        statusId: job.statusId,
      })));

      for (const job of jobs) {
        const previous = this.knownJobs.get(job.id);
        if (previous?.statusId === 2 && job.statusId === 3) {
          this.events$.next({
            type: 'completed',
            jobId: job.id,
            transcriptionId: job.referenceId,
            title: job.title,
          });
        }

        if (previous?.statusId === 2 && job.statusId === 4) {
          this.events$.next({
            type: 'failed',
            jobId: job.id,
            transcriptionId: job.referenceId,
            status: job.errorMessage ?? undefined,
            title: job.title,
          });
        }

        if (previous?.statusId === 2 && job.statusId === 5) {
          this.events$.next({
            type: 'canceled',
            jobId: job.id,
            transcriptionId: job.referenceId,
            title: job.title,
          });
        }
      }

      this.knownJobs = new Map(jobs.map((job) => [job.id, job]));
      if (!hasPendingJobs && this.knownJobs.size > 0) {
        this.stop();
      }
    } catch (error) {
      console.warn('Realtime polling fallback failed:', error);
    } finally {
      this.isPolling = false;
    }
  }
}
