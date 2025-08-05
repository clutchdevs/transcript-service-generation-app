import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidenav-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidenav-header.html',
  styleUrl: './sidenav-header.scss'
})
export class SidenavHeader {
  @Input() collapsed: boolean = false;
  @Input() title: string = 'Menú';

  @Output() toggleCollapse = new EventEmitter<void>();

  onToggleCollapse(): void {
    this.toggleCollapse.emit();
  }
}
