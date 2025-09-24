import { Component, inject, computed, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, User } from '../../../../core/services/auth/auth';
import { Header } from '../../components/header/header';
import { Button } from '../../../../shared/components/ui/button/button';
import { Sidenav } from '../../components/sidenav/sidenav';
import { SidenavItemData } from '../../components/sidenav/sidenav-item/sidenav-item';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Header, Button, Sidenav],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  private auth = inject(Auth);
  private router = inject(Router);

  // Computed signals for reactive UI
  readonly user = computed(() => this.auth.user());
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());

  // Sidenav state
  private sidenavCollapsedSignal = signal(false);
  private mobileMenuOpenSignal = signal(false);

  readonly sidenavCollapsed = computed(() => this.sidenavCollapsedSignal());
  readonly mobileMenuOpen = computed(() => this.mobileMenuOpenSignal());
  readonly activeItemId = 'transcriptions';

  // Custom navigation items (optional - will use defaults if empty)
  readonly sidenavItems: SidenavItemData[] = [
    {
      id: 'transcriptions',
      label: 'Mis transcripciones',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      route: '/dashboard',
      badge: '12'
    },
    {
      id: 'new-transcription',
      label: 'Nueva transcripción',
      icon: 'M12 4v16m8-8H4',
      route: '/dashboard/new'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      route: '/dashboard/settings'
    }
  ];

  constructor() {
    // Redirect to auth if not authenticated
    effect(() => {
      if (!this.isAuthenticated()) {
        this.router.navigate(['/auth']);
      }
    });
  }

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
      this.router.navigate(['/auth']);
    } catch (error) {
      console.error('Logout failed:', error);
      this.router.navigate(['/auth']);
    }
  }

  onMobileMenuToggle(): void {
    console.log('Mobile menu toggled');
    this.mobileMenuOpenSignal.set(!this.mobileMenuOpen());
  }

  onUserMenuToggle(): void {
    console.log('User menu toggled');
  }

  onNewTranscription(): void {
    console.log('New transcription clicked');
  }

  // Sidenav event handlers
  onSidenavItemClick(item: SidenavItemData): void {
    console.log('Sidenav item clicked:', item);
  }

  onSidenavToggleCollapse(collapsed: boolean): void {
    console.log('Sidenav collapsed:', collapsed);
    this.sidenavCollapsedSignal.set(collapsed);
  }

  onMobileMenuClose(): void {
    console.log('Mobile menu closed');
    this.mobileMenuOpenSignal.set(false);
  }
}
