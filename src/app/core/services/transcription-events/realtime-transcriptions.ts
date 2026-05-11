import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { Centrifuge, Subscription } from 'centrifuge';
import { environment } from '../../../../environments/environment';
import { Api } from '../api/api';
import { RealtimeTokenResponse, TranscriptionRealtimeEvent, TranscriptionRealtimeStatus } from './transcription-events.types';

interface CentrifugePayload {
  type?: string;
  data?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class RealtimeTranscriptionsService {
  private api = inject(Api);
  private centrifuge: Centrifuge | null = null;
  private subscription: Subscription | null = null;
  private currentUserId: string | null = null;

  readonly status = signal<TranscriptionRealtimeStatus>('idle');
  readonly events$ = new Subject<TranscriptionRealtimeEvent>();

  async connect(userId: string): Promise<'connected' | 'unavailable' | 'error'> {
    if (this.currentUserId === userId && this.centrifuge) {
      return this.status() === 'unavailable' ? 'unavailable' : 'connected';
    }

    this.disconnect();
    this.currentUserId = userId;
    this.status.set('connecting');

    try {
      const token = await this.fetchRealtimeToken();
      const centrifuge = new Centrifuge(environment.realtimeUrl, {
        token,
        getToken: () => this.fetchRealtimeToken(),
      });

      centrifuge.on('connected', () => this.status.set('connected'));
      centrifuge.on('disconnected', () => this.status.set('disconnected'));
      centrifuge.on('error', () => this.status.set('error'));

      const subscription = centrifuge.newSubscription(`user#${userId}`);
      subscription.on('publication', (ctx) => {
        const event = this.normalizePayload(ctx.data as CentrifugePayload);
        if (event) {
          this.events$.next(event);
        }
      });

      subscription.subscribe();
      centrifuge.connect();

      this.centrifuge = centrifuge;
      this.subscription = subscription;
      return 'connected';
    } catch (error) {
      if (this.isRealtimeUnavailable(error)) {
        this.status.set('unavailable');
        return 'unavailable';
      }

      this.status.set('error');
      return 'error';
    }
  }

  disconnect(): void {
    this.subscription?.removeAllListeners();
    this.subscription?.unsubscribe();
    this.centrifuge?.disconnect();
    this.centrifuge?.removeAllListeners();
    this.subscription = null;
    this.centrifuge = null;
    this.currentUserId = null;
    this.status.set('idle');
  }

  private async fetchRealtimeToken(): Promise<string> {
    try {
      const response = await firstValueFrom(this.api.post<RealtimeTokenResponse>('/api/realtime/token', {}));
      const token = response?.data?.token;
      if (!token) {
        throw new Error('Realtime token response did not include a token.');
      }
      return token;
    } catch (error) {
      throw error;
    }
  }

  private normalizePayload(payload: CentrifugePayload): TranscriptionRealtimeEvent | null {
    const data = payload.data ?? {};
    const jobId = typeof data['jobId'] === 'string' ? data['jobId'] : '';
    const transcriptionId = typeof data['transcriptionId'] === 'string' ? data['transcriptionId'] : '';
    const title = typeof data['title'] === 'string' ? data['title'] : undefined;

    if (!jobId) {
      return null;
    }

    if (payload.type === 'transcription.completed') {
      if (!transcriptionId) {
        return null;
      }
      return { type: 'completed', jobId, transcriptionId, title };
    }

    if (payload.type === 'transcription.failed') {
      if (!transcriptionId) {
        return null;
      }
      const status = typeof data['status'] === 'string' ? data['status'] : undefined;
      return { type: 'failed', jobId, transcriptionId, status, title };
    }

    if (payload.type === 'job.updated') {
      const statusId = typeof data['statusId'] === 'number' ? data['statusId'] : undefined;
      return { type: 'updated', jobId, statusId, title };
    }

    if (payload.type === 'job.deleted') {
      return { type: 'deleted', jobId };
    }

    if (payload.type === 'job.canceled') {
      return { type: 'canceled', jobId, title };
    }

    return null;
  }

  private isRealtimeUnavailable(error: unknown): boolean {
    return (error as { status?: number } | undefined)?.status === 503;
  }
}
