import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { User } from '../../../../../core/services/auth/auth';
import { Avatar } from '../../../../../shared/components/ui/avatar/avatar';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [Avatar],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss'
})
export class UserMenu {
  @Input() user: User | null = null;
  @Input() isOpen: boolean = false;

  @Output() logout = new EventEmitter<void>();
  @Output() menuToggle = new EventEmitter<void>();

  readonly userDisplayName = computed(() => {
    const user = this.user;
    if (!user) return 'Usuario';
    return user.name || user.email?.split('@')[0] || 'Usuario';
  });

  readonly userEmail = computed(() => {
    return this.user?.email || '';
  });



  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onLogout(): void {
    this.logout.emit();
  }
}
