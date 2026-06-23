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
  private readonly SUBSCRIPTION_READY_TIMEOUT_MS = 8000;
  private api = inject(Api);
  private centrifuge: Centrifuge | null = null;
  private subscription: Subscription | null = null;
  private testSubscription: Subscription | null = null;
  private currentUserId: string | null = null;

  readonly status = signal<TranscriptionRealtimeStatus>('idle');
  readonly events$ = new Subject<TranscriptionRealtimeEvent>();

  async connect(userId: string): Promise<'connected' | 'unavailable' | 'error'> {
    if (this.currentUserId === userId && this.centrifuge) {
      const status = this.status();
      if (status === 'connected') {
        console.debug('[Realtime] already initialized for user', { userId, status });
        return 'connected';
      }
      console.debug('[Realtime] rebuilding unhealthy connection for user', { userId, status });
    }

    this.disconnect();
    this.currentUserId = userId;
    this.status.set('connecting');
    console.debug('[Realtime] connecting', { userId, url: environment.realtimeUrl });

    try {
      const token = await this.fetchRealtimeToken();
      const centrifuge = new Centrifuge(environment.realtimeUrl, {
        token,
        getToken: () => this.fetchRealtimeToken(),
      });

      centrifuge.on('connected', (ctx) => {
        console.debug('[Realtime] connected', ctx);
        this.status.set('connected');
      });
      centrifuge.on('disconnected', (ctx) => {
        console.warn('[Realtime] disconnected', ctx);
        this.status.set('disconnected');
      });
      centrifuge.on('error', (ctx) => {
        console.error('[Realtime] client error', ctx);
        this.status.set('error');
      });

      const channel = `user#${userId}`;
      console.debug('[Realtime] subscribing', { channel });
      const subscription = centrifuge.newSubscription(channel);
      subscription.on('subscribing', (ctx) => console.debug('[Realtime] subscription subscribing', ctx));
      subscription.on('subscribed', (ctx) => console.debug('[Realtime] subscription subscribed', ctx));
      subscription.on('unsubscribed', (ctx) => console.warn('[Realtime] subscription unsubscribed', ctx));
      subscription.on('error', (ctx) => console.error('[Realtime] subscription error', ctx));
      subscription.on('publication', (ctx) => {
        const payload = ctx.data as CentrifugePayload;
        console.debug('[Realtime] publication raw', payload);
        if (payload.type === 'test') {
          console.log('[Realtime] test event received', payload);
          return;
        }

        const event = this.normalizePayload(payload);
        if (event) {
          console.debug('[Realtime] publication normalized', event);
          this.events$.next(event);
        } else {
          console.warn('[Realtime] publication ignored', payload);
        }
      });

      subscription.subscribe();

      const testSubscription = centrifuge.newSubscription('test');
      testSubscription.on('subscribing', (ctx) => console.debug('[Realtime] test channel subscribing', ctx));
      testSubscription.on('subscribed', (ctx) => console.debug('[Realtime] test channel subscribed', ctx));
      testSubscription.on('unsubscribed', (ctx) => console.warn('[Realtime] test channel unsubscribed', ctx));
      testSubscription.on('error', (ctx) => console.error('[Realtime] test channel error', ctx));
      testSubscription.on('publication', (ctx) => {
        console.log('[Realtime] test channel event received', ctx.data);
      });
      testSubscription.subscribe();

      centrifuge.connect();

      this.centrifuge = centrifuge;
      this.subscription = subscription;
      this.testSubscription = testSubscription;
      await this.waitForSubscriptionReady(subscription, centrifuge);
      return 'connected';
    } catch (error) {
      console.error('[Realtime] connection failed', error);
      this.disconnect();
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
    this.testSubscription?.removeAllListeners();
    this.testSubscription?.unsubscribe();
    this.centrifuge?.disconnect();
    this.centrifuge?.removeAllListeners();
    this.subscription = null;
    this.testSubscription = null;
    this.centrifuge = null;
    this.currentUserId = null;
    this.status.set('idle');
  }

  private async fetchRealtimeToken(): Promise<string> {
    try {
      console.debug('[Realtime] fetching token');
      const response = await firstValueFrom(this.api.post<RealtimeTokenResponse>('/api/realtime/token', {}));
      const token = response?.data?.token;
      if (!token) {
        throw new Error('Realtime token response did not include a token.');
      }
      console.debug('[Realtime] token received', { expiresAt: response.data?.expiresAt });
      return token;
    } catch (error) {
      console.error('[Realtime] token failed', error);
      throw error;
    }
  }

  private waitForSubscriptionReady(subscription: Subscription, centrifuge: Centrifuge): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        clearTimeout(timeoutId);
        subscription.off('subscribed', onSubscribed);
        subscription.off('error', onSubscriptionError);
        subscription.off('unsubscribed', onUnsubscribed);
        centrifuge.off('error', onClientError);
      };

      const finish = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        callback();
      };

      const onSubscribed = () => finish(resolve);
      const onSubscriptionError = (ctx: unknown) => finish(() => reject(ctx));
      const onUnsubscribed = (ctx: unknown) => finish(() => reject(ctx));
      const onClientError = (ctx: unknown) => finish(() => reject(ctx));
      const timeoutId = setTimeout(() => {
        finish(() => reject(new Error('Realtime subscription did not become ready.')));
      }, this.SUBSCRIPTION_READY_TIMEOUT_MS);

      subscription.on('subscribed', onSubscribed);
      subscription.on('error', onSubscriptionError);
      subscription.on('unsubscribed', onUnsubscribed);
      centrifuge.on('error', onClientError);
    });
  }

  private normalizePayload(payload: CentrifugePayload): TranscriptionRealtimeEvent | null {
    const data = payload.data ?? {};
    const jobId = typeof data['jobId'] === 'string' ? data['jobId'] : '';
    const transcriptionId = typeof data['transcriptionId'] === 'string' ? data['transcriptionId'] : '';
    const title = typeof data['title'] === 'string' ? data['title'] : undefined;

    if (!jobId) {
      console.warn('[Realtime] ignored payload without jobId', payload);
      return null;
    }

    if (payload.type === 'transcription.completed') {
      if (!transcriptionId) {
        console.warn('[Realtime] ignored completed payload without transcriptionId', payload);
        return null;
      }
      return { type: 'completed', jobId, transcriptionId, title };
    }

    if (payload.type === 'transcription.failed') {
      if (!transcriptionId) {
        console.warn('[Realtime] ignored failed payload without transcriptionId', payload);
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

    console.warn('[Realtime] ignored unknown payload type', payload);
    return null;
  }

  private isRealtimeUnavailable(error: unknown): boolean {
    return (error as { status?: number } | undefined)?.status === 503;
  }
}
