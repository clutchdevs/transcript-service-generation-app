import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidenavHeader } from '../sidenav-header/sidenav-header';
import { SidenavItem, SidenavItemData } from '../sidenav-item/sidenav-item';

export interface SidenavItemConfig {
  id: string;
  label: string;
  icon: string;
  route?: string;
  badge?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, SidenavHeader, SidenavItem],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss'
})
export class Sidenav {
  @Input() items: SidenavItemConfig[] = [];
  @Input() activeItemId: string = '';
  @Input() set collapsed(value: boolean) {
    this.isCollapsed.set(value);
  }
  @Input() set mobileOpen(value: boolean) {
    this.isMobileOpen.set(value);
  }

  @Output() itemClick = new EventEmitter<SidenavItemConfig>();
  @Output() toggleCollapse = new EventEmitter<boolean>();
  @Output() mobileMenuClose = new EventEmitter<void>();

  private router = new Router();

  // Internal state
  private isCollapsed = signal(false);
  private isMobileOpen = signal(false);

  readonly collapsed$ = computed(() => this.isCollapsed());
  readonly mobileOpen$ = computed(() => this.isMobileOpen());

  // Default navigation items
  readonly defaultItems: SidenavItemConfig[] = [
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
      id: 'analytics',
      label: 'Analytics',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      route: '/dashboard/analytics'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      route: '/dashboard/settings'
    }
  ];

  // Computed navigation items
  readonly navigationItems = computed(() => this.items.length > 0 ? this.items : this.defaultItems);

  // Methods
  onItemClick(item: SidenavItemConfig): void {
    if (item.disabled) return;

    this.itemClick.emit(item);

    // Close mobile menu when item is clicked
    if (this.mobileOpen$()) {
      this.closeMobileMenu();
    }

    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  onToggleCollapse(): void {
    const newCollapsedState = !this.collapsed$();
    this.isCollapsed.set(newCollapsedState);
    this.toggleCollapse.emit(newCollapsedState);
  }

  closeMobileMenu(): void {
    this.isMobileOpen.set(false);
    this.mobileMenuClose.emit();
  }

  isActive(item: SidenavItemConfig): boolean {
    return this.activeItemId === item.id;
  }


}
