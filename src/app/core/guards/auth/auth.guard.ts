import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    // Ensure profile is loaded in a single, idempotent call
    auth.ensureProfile();
    return true;
  }

  return router.createUrlTree(['/auth']);
};

export const guestGuard: CanMatchFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return auth.isAuthenticated()
    ? router.createUrlTree(['/dashboard'])
    : true;
};

