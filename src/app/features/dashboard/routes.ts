import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth/auth.guard';

export const dashboardRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    children: [
      { path: '', redirectTo: 'transcriptions', pathMatch: 'full' },
      {
        path: 'transcriptions',
        loadComponent: () =>
          import('./pages/transcriptions/transcriptions').then(m => m.Transcriptions),
      },
      {
        path: 'new',
        loadComponent: () => import('./pages/new-transcription/new-transcription').then((m) => m.NewTranscription),
      }
    ]
  }
];
