import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/routes').then((m) => m.authRoutes),
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/routes').then((m) => m.dashboardRoutes),
  },
  {
    path: '',
    redirectTo: '/auth',
    pathMatch: 'full',
  },
];
