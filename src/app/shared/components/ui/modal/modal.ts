import { Component, EventEmitter, HostListener, Input, Output, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss'
})
export class Modal implements AfterViewInit, OnDestroy, OnChanges {
  // State
  @Input() open: boolean = false;

  @ViewChild('dialog', { static: false }) dialogRef?: ElementRef<HTMLDivElement>;
  @ViewChild('closeButton', { static: false }) closeButtonRef?: ElementRef<HTMLButtonElement>;

  private previousActiveElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  // UI
  @Input() title?: string;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() dismissible: boolean = true;
  @Input() showCloseButton: boolean = true;

  // Events
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  // A11y
  private static idCounter = 0;
  readonly modalTitleId = `modal-title-${Modal.idCounter++}`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        // Use setTimeout to ensure view is initialized
        setTimeout(() => this.onModalOpen(), 0);
      } else {
        this.onModalClose();
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.open) {
      this.onModalOpen();
    }
  }

  ngOnDestroy(): void {
    this.onModalClose();
  }

  private onModalOpen(): void {
    // Save previous active element
    this.previousActiveElement = document.activeElement as HTMLElement;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus management after view is initialized
    setTimeout(() => {
      this.updateFocusableElements();
      this.focusFirstElement();
    }, 0);
  }

  private onModalClose(): void {
    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus to previous element
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
  }

  private updateFocusableElements(): void {
    if (!this.dialogRef?.nativeElement) return;

    const dialog = this.dialogRef.nativeElement;
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(selector))
      .filter(el => !el.hasAttribute('disabled') && !el.hasAttribute('hidden'));
  }

  private focusFirstElement(): void {
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    } else if (this.closeButtonRef?.nativeElement) {
      this.closeButtonRef.nativeElement.focus();
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.dialogRef?.nativeElement) return;

    this.updateFocusableElements();
    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

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
  onEsc(event: Event): void {
    if (!this.open || !this.dismissible) return;
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.onClose();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.open) return;
    this.trapFocus(event);
  }
}
