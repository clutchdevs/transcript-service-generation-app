import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

// Route constants for better maintainability
export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },
  DASHBOARD: '/dashboard',
  HOME: '/',
  PROFILE: '/profile'
} as const;

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private router = inject(Router);

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.router.navigate([ROUTES.AUTH.LOGIN]);
  }

  /**
   * Navigate to register page
   */
  goToRegister(): void {
    this.router.navigate([ROUTES.AUTH.REGISTER]);
  }

  /**
   * Navigate to forgot password page
   */
  goToForgotPassword(): void {
    this.router.navigate([ROUTES.AUTH.FORGOT_PASSWORD]);
  }

  /**
   * Navigate to reset password page with token
   * @param token - Reset password token
   */
  goToResetPassword(token: string): void {
    this.router.navigate([ROUTES.AUTH.RESET_PASSWORD], {
      queryParams: { token }
    });
  }

  /**
   * Navigate to dashboard
   */
  goToDashboard(): void {
    this.router.navigate([ROUTES.DASHBOARD]);
  }

  /**
   * Navigate to home page
   */
  goToHome(): void {
    this.router.navigate([ROUTES.HOME]);
  }

  /**
   * Navigate to profile page
   */
  goToProfile(): void {
    this.router.navigate([ROUTES.PROFILE]);
  }

  /**
   * Navigate to a specific route
   * @param route - Route path
   * @param params - Query parameters
   */
  navigate(route: string, params?: Record<string, any>): void {
    if (params) {
      this.router.navigate([route], { queryParams: params });
    } else {
      this.router.navigate([route]);
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute(): string {
    return this.router.url;
  }

  /**
   * Check if current route matches pattern
   * @param pattern - Route pattern to match
   */
  isCurrentRoute(pattern: string): boolean {
    return this.router.url.includes(pattern);
  }
}
