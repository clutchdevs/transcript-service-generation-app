import { Component, Input, Output, EventEmitter, computed, HostListener, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { User } from '../../../../../core/services/auth/auth';
import { Avatar } from '../../../../../shared/components/ui/avatar/avatar';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [Avatar],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss'
})
export class UserMenu implements AfterViewInit, OnDestroy, OnChanges {
  @Input() user: User | null = null;
  @Input() isOpen: boolean = false;

  @Output() logout = new EventEmitter<void>();
  @Output() menuToggle = new EventEmitter<void>();
  @Output() profileClick = new EventEmitter<void>();
  @Output() settingsClick = new EventEmitter<void>();

  @ViewChild('menuButton', { static: false }) menuButtonRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('dropdown', { static: false }) dropdownRef?: ElementRef<HTMLDivElement>;

  private menuItems: HTMLElement[] = [];
  private currentFocusIndex = -1;
  private previousActiveElement: HTMLElement | null = null;

  readonly userDisplayName = computed(() => {
    const user = this.user;
    if (!user) return 'Usuario';
    return user.name || user.email?.split('@')[0] || 'Usuario';
  });

  readonly userEmail = computed(() => {
    return this.user?.email || '';
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.onMenuOpen();
      } else {
        this.onMenuClose();
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.isOpen) {
      this.onMenuOpen();
    }
  }

  ngOnDestroy(): void {
    this.onMenuClose();
  }

  // Cerrar menú al hacer click fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;

    const target = event.target as HTMLElement;
    const clickedInside =
      this.menuButtonRef?.nativeElement?.contains(target) ||
      this.dropdownRef?.nativeElement?.contains(target);

    if (!clickedInside) {
      this.closeMenu();
    }
  }

  // Cerrar menú con tecla Escape
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.isOpen) {
      const keyboardEvent = event as KeyboardEvent;
      keyboardEvent.preventDefault();
      this.closeMenu();
    }
  }

  // Manejo de teclado dentro del menú (solo cuando el menú está abierto y el focus está en el dropdown)
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen || !this.dropdownRef?.nativeElement?.contains(event.target as HTMLElement)) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousItem();
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirstItem();
        break;
      case 'End':
        event.preventDefault();
        this.focusLastItem();
        break;
      case 'Enter':
      case ' ':
        if (this.currentFocusIndex >= 0 && this.menuItems[this.currentFocusIndex]) {
          event.preventDefault();
          this.menuItems[this.currentFocusIndex].click();
        }
        break;
    }
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
    // El estado se maneja en el componente padre, pero necesitamos preparar el focus
    if (!this.isOpen) {
      // El menú se va a abrir
      this.openMenu();
    } else {
      // El menú se va a cerrar
      this.onMenuClose();
    }
  }

  openMenu(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    setTimeout(() => {
      this.updateMenuItems();
      this.focusFirstItem();
    }, 0);
  }

  closeMenu(): void {
    this.onMenuClose();
    this.menuToggle.emit();
  }

  private onMenuOpen(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    setTimeout(() => {
      this.updateMenuItems();
      this.focusFirstItem();
    }, 0);
  }

  private onMenuClose(): void {
    this.currentFocusIndex = -1;
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
  }

  private updateMenuItems(): void {
    if (!this.dropdownRef?.nativeElement) return;
    const selector = 'button, [role="menuitem"]';
    this.menuItems = Array.from(
      this.dropdownRef.nativeElement.querySelectorAll<HTMLElement>(selector)
    );
  }

  private focusFirstItem(): void {
    if (this.menuItems.length > 0) {
      this.currentFocusIndex = 0;
      this.menuItems[0].focus();
    }
  }

  private focusLastItem(): void {
    if (this.menuItems.length > 0) {
      this.currentFocusIndex = this.menuItems.length - 1;
      this.menuItems[this.currentFocusIndex].focus();
    }
  }

  private focusNextItem(): void {
    if (this.menuItems.length === 0) return;
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.menuItems.length;
    this.menuItems[this.currentFocusIndex].focus();
  }

  private focusPreviousItem(): void {
    if (this.menuItems.length === 0) return;
    this.currentFocusIndex = this.currentFocusIndex <= 0
      ? this.menuItems.length - 1
      : this.currentFocusIndex - 1;
    this.menuItems[this.currentFocusIndex].focus();
  }

  onProfileClick(): void {
    this.profileClick.emit();
    this.closeMenu();
  }

  onSettingsClick(): void {
    this.settingsClick.emit();
    this.closeMenu();
  }

  onLogout(): void {
    this.logout.emit();
    this.closeMenu();
  }
}
