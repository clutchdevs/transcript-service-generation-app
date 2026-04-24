import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Button } from '../../../../../shared/components/ui/button/button';

@Component({
  selector: 'app-sidenav-header',
  standalone: true,
  imports: [Button],
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
