import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    redirectTo: '/auth',
    pathMatch: 'full',
  },
];
