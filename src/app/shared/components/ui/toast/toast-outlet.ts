import { Component, computed, inject } from '@angular/core';
import { ToastMessage, ToastService } from '../../../../core/services/toast/toast';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  private toast = inject(ToastService);

  readonly messages = computed(() => this.toast.messages());

  dismiss(id: string): void {
    this.toast.dismiss(id);
  }

  getToastClasses(message: ToastMessage): string {
    const base =
      'pointer-events-auto w-full rounded-xl border px-4 py-3 md:px-5 md:py-4 shadow-xl ring-1 backdrop-blur-sm';
    const variants: Record<ToastMessage['variant'], string> = {
      success: 'border-emerald-200/90 bg-emerald-50/95 text-emerald-950 ring-emerald-100',
      error: 'border-rose-200/90 bg-rose-50/95 text-rose-950 ring-rose-100',
      info: 'border-sky-200/90 bg-sky-50/95 text-sky-950 ring-sky-100',
    };

    return `${base} ${variants[message.variant]}`;
  }

  getIconContainerClasses(message: ToastMessage): string {
    const base = 'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full md:h-7 md:w-7';
    const variants: Record<ToastMessage['variant'], string> = {
      success: 'bg-emerald-200 text-emerald-800',
      error: 'bg-rose-200 text-rose-800',
      info: 'bg-sky-200 text-sky-800',
    };

    return `${base} ${variants[message.variant]}`;
  }

  getIconPath(message: ToastMessage): string {
    const icons: Record<ToastMessage['variant'], string> = {
      success: 'M5 13l4 4L19 7',
      error: 'M6 18L18 6M6 6l12 12',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };

    return icons[message.variant];
  }
}
