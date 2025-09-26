import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss'
})
export class Modal {
  // State
  @Input() open: boolean = false;

  // UI
  @Input() title?: string;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() dismissible: boolean = true;
  @Input() showCloseButton: boolean = true;

  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  // A11y
  readonly modalTitleId = `modal-title-${Date.now()}`;

  onOverlayClick(): void {
    if (!this.dismissible) return;
    this.onClose();
  }

  onClose(): void {
    this.closed.emit();
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  get dialogClasses(): string {
    const base = 'bg-white rounded-lg shadow-xl w-full';
    const sizes: Record<typeof this.size, string> = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
    } as const;
    return `${base} ${sizes[this.size]}`;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEsc(event: any): void {
    if (!this.open || !this.dismissible) return;
    event.preventDefault();
    this.onClose();
  }
}
