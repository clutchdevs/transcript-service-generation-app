import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logo.html',
  styleUrl: './logo.scss'
})
export class Logo {
  @Input() appTitle: string = 'TranscriptAI';
  @Input() showIcon: boolean = true;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get logoClasses(): string {
    const baseClasses = 'flex items-center';
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-lg sm:text-xl',
      lg: 'text-xl sm:text-2xl'
    };
    return `${baseClasses} ${sizeClasses[this.size]}`;
  }

  get iconContainerClasses(): string {
    const sizeClasses = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-10 w-10'
    };
    return `bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center ${sizeClasses[this.size]}`;
  }

  get svgClasses(): string {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };
    return `text-white ${sizeClasses[this.size]}`;
  }
}
