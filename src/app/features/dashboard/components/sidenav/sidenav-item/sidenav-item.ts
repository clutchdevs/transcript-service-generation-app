import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
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
      ? 'group relative flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      : 'group relative flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

    const stateClasses = this.active
      ? 'bg-blue-50 border-blue-500 text-blue-700'
      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900';

    const disabledClasses = this.item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

    const collapsedClasses = this.collapsed ? 'collapsed' : '';

    return `${baseClasses} ${stateClasses} ${disabledClasses} ${collapsedClasses}`;
  }

  getIconClasses(): string {
    const baseClasses = 'flex-shrink-0 h-5 w-5';
    const activeClasses = this.active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500';
    return `${baseClasses} ${activeClasses}`;
  }
}
