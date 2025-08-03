import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../../core/services/auth/auth';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss'
})
export class Avatar {
  @Input() user: User | null = null;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() showStatus: boolean = false;
  @Input() imageUrl?: string;

  get avatarClasses(): string {
    const sizeClasses = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-10 w-10',
      xl: 'h-12 w-12'
    };
    return `bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center ${sizeClasses[this.size]}`;
  }

  get textClasses(): string {
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg'
    };
    return `font-medium text-white ${sizeClasses[this.size]}`;
  }

  get statusClasses(): string {
    const sizeClasses = {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
      lg: 'h-2.5 w-2.5',
      xl: 'h-3 w-3'
    };
    return `absolute bottom-0 right-0 bg-green-400 border-2 border-white rounded-full ${sizeClasses[this.size]}`;
  }

  readonly userDisplayName = computed(() => {
    const user = this.user;
    if (!user) return 'U';
    return user.name || user.email?.split('@')[0] || 'U';
  });

  readonly userInitials = computed(() => {
    const name = this.userDisplayName();
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });
}
