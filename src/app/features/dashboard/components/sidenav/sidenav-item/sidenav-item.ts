import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SidenavItemData {
  id: string;
  label: string;
  icon: string;
  route?: string;
  badge?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-sidenav-item',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidenav-item.html',
  styleUrl: './sidenav-item.scss'
})
export class SidenavItem {
  @Input() item!: SidenavItemData;
  @Input() collapsed: boolean = false;
  @Input() active: boolean = false;

  @Output() itemClick = new EventEmitter<SidenavItemData>();

  onItemClick(): void {
    if (this.item.disabled) return;
    this.itemClick.emit(this.item);
  }

  getItemClasses(): string {
    const baseClasses = this.collapsed
      ? 'group relative flex items-center px-3 py-2 text-sm font-medium transition-all duration-200'
      : 'group relative flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-all duration-200';

    // Keep base text color neutral; active styles come from routerLinkActive
    const hoverClasses = 'border-transparent text-gray-600 hover:bg-blue-50 hover:text-blue-700';
    const disabledClasses = this.item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
    const collapsedClasses = this.collapsed ? 'collapsed' : '';

    return `${baseClasses} ${hoverClasses} ${disabledClasses} ${collapsedClasses}`;
  }

  getIconClasses(): string {
    // Color is controlled in template with rla.isActive bindings to avoid conflicts
    return 'flex-shrink-0 h-5 w-5';
  }
}
