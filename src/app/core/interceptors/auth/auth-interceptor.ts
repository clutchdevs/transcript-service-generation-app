import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '../../services/auth/auth';
import { STORAGE_KEYS } from '../../constants/storage';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

function getTokenFromStorage(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/login') ||
         url.includes('/api/auth/refresh-token') ||
         url.includes('/api/auth/forgot-password') ||
         url.includes('/api/auth/reset-password') ||
         url.includes('/api/auth/register');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);

  // Shared refresh lock across requests
  let refreshInFlight = (authInterceptor as any)._refreshInFlight as Promise<boolean> | null;
  const setRefreshInFlight = (p: Promise<boolean> | null) => ((authInterceptor as any)._refreshInFlight = p);

  // Attach Authorization header if token exists and header not already set
  const token = getTokenFromStorage();
  let authReq = req;
  if (token && !req.headers.has('Authorization')) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const status = error.status;
      const message = (error.error?.message as string | undefined)?.toLowerCase();

      // Skip refresh handling for auth endpoints themselves
      if (isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      // If token invalid/expired, try refreshing once then retry original request
      const shouldRefresh = status === 401 || status === 403 || (message?.includes('expired') || message?.includes('invalid'));
      if (!shouldRefresh) {
        return throwError(() => error);
      }

      const refreshOnce = () => {
        // Reuse in-flight refresh if present
        if (!refreshInFlight) {
          refreshInFlight = auth.refreshToken().finally(() => setRefreshInFlight(null));
          setRefreshInFlight(refreshInFlight);
        }
        return refreshInFlight;
      };

      return from(refreshOnce()).pipe(
        switchMap((ok: boolean) => {
          if (!ok) {
            return throwError(() => error);
          }
          const newToken = getTokenFromStorage();
          const retryReq = newToken
            ? authReq.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
            : authReq;
          return next(retryReq);
        })
      );
    })
  );
};
