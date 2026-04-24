import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);

  success(message: string, durationMs = 3000): void {
    this.push(message, 'success', durationMs);
  }

  error(message: string, durationMs = 4000): void {
    this.push(message, 'error', durationMs);
  }

  info(message: string, durationMs = 3000): void {
    this.push(message, 'info', durationMs);
  }

  dismiss(id: string): void {
    this.messages.update((list) => list.filter((message) => message.id !== id));
  }

  private push(message: string, variant: ToastVariant, durationMs: number): void {
    const toast: ToastMessage = {
      id: this.createId(),
      message,
      variant,
      durationMs,
    };

    this.messages.update((list) => [...list, toast]);

    window.setTimeout(() => {
      this.dismiss(toast.id);
    }, toast.durationMs);
  }

  private createId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
