import { Component, Input, Output, EventEmitter, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidenavHeader } from './sidenav-header/sidenav-header';
import { SidenavItem } from './sidenav-item/sidenav-item';

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
export class Sidenav implements OnInit, OnDestroy {
  @Input() items: SidenavItemConfig[] = [];
  @Input() activeItemId: string = '';
  @Input() set collapsed(value: boolean) {
    this.isCollapsed.set(value);
  }
  @Input() set mobileOpen(value: boolean) {
    this.isMobileOpen.set(value);
    // Si se está abriendo en móvil, verificar si estamos en desktop
    if (value && window.innerWidth >= 1024) {
      console.log('Mobile menu opened on desktop, closing automatically');
      this.isMobileOpen.set(false);
      this.mobileMenuClose.emit();
    }
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

  ngOnInit(): void {
    // Siempre agregar el listener para detectar cambios de viewport
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  // Helper methods for responsive behavior
  isCollapsedInCurrentView(): boolean {
    // In mobile view, always show expanded (not collapsed)
    if (this.mobileOpen$()) {
      return false;
    }
    // In desktop view, use the collapsed state
    return this.collapsed$();
  }



  getSidenavClasses(): string {
    // In mobile view, always use full width
    if (this.mobileOpen$()) {
      return 'w-64';
    }
    // In desktop view, use collapsed state
    return this.collapsed$() ? 'w-16' : 'w-64';
  }

  // Navigation items
  readonly navigationItems = computed(() => this.items);

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

  private handleResize(): void {
    // Si cambiamos a desktop (lg+) y el menú móvil está abierto, cerrarlo
    if (window.innerWidth >= 1024 && this.isMobileOpen()) {
      console.log('Resize detected: switching to desktop, closing mobile menu');
      this.isMobileOpen.set(false);
      this.mobileMenuClose.emit();
    }
  }
}
