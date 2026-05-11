import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../shared/components/ui/button/button';

type RealtimeConnectionState = 'disconnected' | 'connecting' | 'live' | 'reconnecting' | 'error';

@Component({
  selector: 'app-realtime',
  standalone: true,
  imports: [CommonModule, FormsModule, Button],
  templateUrl: './realtime.html',
  styleUrl: './realtime.scss'
})
export class Realtime {
  readonly connectionState = signal<RealtimeConnectionState>('disconnected');
  readonly partialTranscript = signal('');
  readonly finalTranscripts = signal<string[]>([]);
  readonly uiError = signal<string | null>(null);

  language = 'es';
  maxDelay = 1;
  enablePartials = true;
  diarization: 'none' | 'speaker' | 'channel' = 'none';

  readonly connectionBadgeClasses = computed(() => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';
    switch (this.connectionState()) {
      case 'connecting':
      case 'reconnecting':
        return `${base} bg-amber-100 text-amber-800`;
      case 'live':
        return `${base} bg-green-100 text-green-800`;
      case 'error':
        return `${base} bg-red-100 text-red-800`;
      default:
        return `${base} bg-gray-100 text-gray-700`;
    }
  });

  readonly canStart = computed(() => this.connectionState() === 'disconnected' || this.connectionState() === 'error');
  readonly canStop = computed(() => this.connectionState() === 'connecting' || this.connectionState() === 'live' || this.connectionState() === 'reconnecting');

  startSession(): void {
    this.uiError.set(null);
    this.connectionState.set('connecting');

    setTimeout(() => {
      this.connectionState.set('live');
      if (this.enablePartials) {
        this.partialTranscript.set('Este es un parcial de prueba en tiempo real.');
      }
      this.finalTranscripts.set([
        'Esta es una transcripcion final de ejemplo para validar la UI del modulo realtime.'
      ]);
    }, 600);
  }

  stopSession(): void {
    this.connectionState.set('disconnected');
    this.partialTranscript.set('');
  }

  retrySession(): void {
    this.connectionState.set('reconnecting');
    this.uiError.set(null);
    setTimeout(() => {
      this.connectionState.set('live');
      this.partialTranscript.set('Reconectado. Continuando transcripcion...');
    }, 500);
  }

  simulateConnectionError(): void {
    this.connectionState.set('error');
    this.uiError.set('No se pudo conectar. Cuando backend exponga el token realtime, aqui conectaremos con Speechmatics.');
  }
}
