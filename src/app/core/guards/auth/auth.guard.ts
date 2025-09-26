import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../../services/auth/auth';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    // Ensure profile is loaded in a single, idempotent call
    auth.ensureProfile();
    return true;
  }

  router.navigate(['/auth']);
  return false;
};


