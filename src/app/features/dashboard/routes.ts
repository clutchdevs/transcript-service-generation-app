import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  // Future dashboard routes can be added here
  // {
  //   path: 'profile',
  //   loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  // },
  // {
  //   path: 'transcriptions',
  //   loadComponent: () => import('./pages/transcriptions/transcriptions').then((m) => m.Transcriptions),
  // },
];
