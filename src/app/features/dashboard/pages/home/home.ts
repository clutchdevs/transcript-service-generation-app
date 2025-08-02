import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../../../core/services/auth/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  private auth = inject(Auth);
  private router = inject(Router);

  constructor() {}

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
      this.router.navigate(['/auth']);
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, redirect to login
      this.router.navigate(['/auth']);
    }
  }
}
