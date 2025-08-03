import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../../core/services/auth/auth';
import { Button } from '../../../../shared/components/ui/button/button';
import { Logo } from '../../../../shared/components/ui/logo/logo';
import { UserMenu } from './user-menu/user-menu';

export interface HeaderConfig {
  appTitle?: string;
  showUserMenu?: boolean;
  showMobileMenu?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, Button, Logo, UserMenu],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  // Inputs
  @Input() user: User | null = null;
  @Input() config: HeaderConfig = {
    appTitle: 'TranscriptAI',
    showUserMenu: true,
    showMobileMenu: true
  };
  @Input() set mobileMenuOpen(value: boolean) {
    this.isMobileMenuOpen.set(value);
  }

  // Outputs
  @Output() logout = new EventEmitter<void>();
  @Output() mobileMenuToggle = new EventEmitter<void>();
  @Output() userMenuToggle = new EventEmitter<void>();

  // Internal state
  private isMobileMenuOpen = signal(false);
  private isUserMenuOpen = signal(false);

  // Computed signals
  readonly isMobileMenuOpen$ = computed(() => this.isMobileMenuOpen());
  readonly isUserMenuOpen$ = computed(() => this.isUserMenuOpen());

  // Methods
  onLogout(): void {
    this.logout.emit();
  }

  onMobileMenuToggle(): void {
    this.mobileMenuToggle.emit();
  }

  onUserMenuToggle(): void {
    this.isUserMenuOpen.update(open => !open);
    this.userMenuToggle.emit();
  }


}
