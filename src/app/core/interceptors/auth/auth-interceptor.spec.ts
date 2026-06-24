import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => 
    TestBed.runInInjectionContext(() => authInterceptor(req, next));

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should attach localStorage token', () => {
    localStorage.setItem('auth_token', 'local-access-token');
    const req = new HttpRequest('GET', '/api/example');
    const next = jest.fn().mockReturnValue(of({}));

    interceptor(req, next).subscribe();

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({})
    }));
    expect(next.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer local-access-token');
  });

  it('should ignore stale sessionStorage token', () => {
    sessionStorage.setItem('auth_token', 'session-access-token');
    const req = new HttpRequest('GET', '/api/example');
    const next = jest.fn().mockReturnValue(of({}));

    interceptor(req, next).subscribe();

    expect(next.mock.calls[0][0].headers.has('Authorization')).toBe(false);
  });
});
