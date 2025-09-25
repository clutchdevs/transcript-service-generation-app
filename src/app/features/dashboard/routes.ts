import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
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
