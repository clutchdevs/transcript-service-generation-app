import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Auth } from './auth';
import { Api } from '../api/api';

describe('Auth', () => {
  let service: Auth;
  let apiMock: {
    post: jest.Mock;
    get: jest.Mock;
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();

    apiMock = {
      post: jest.fn(),
      get: jest.fn().mockReturnValue(of({ success: true, data: null })),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Api,
          useValue: apiMock,
        }
      ]
    });
    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not refresh automatically on construction', () => {
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('should store login tokens in localStorage', async () => {
    sessionStorage.setItem('auth_token', 'stale-session-access-token');
    sessionStorage.setItem('refresh_token', 'stale-session-refresh-token');
    apiMock.post.mockReturnValue(of({
      success: true,
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    }));

    await service.login({ email: 'test@example.com', password: '12345678' });

    expect(localStorage.getItem('auth_token')).toBe('access-token');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-token');
    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
  });

  it('should show invalid credentials for 401 login errors', async () => {
    apiMock.post.mockReturnValue(throwError(() => ({ status: 401, message: 'Unauthorized' })));

    await expect(service.login({ email: 'test@example.com', password: '12345678' }))
      .rejects.toThrow('Correo o contraseña incorrectos');

    expect(service.error()).toBe('Correo o contraseña incorrectos');
  });

  it('should show secure connection error for cert issues', async () => {
    apiMock.post.mockReturnValue(throwError(() => ({ status: 0, message: 'net::ERR_CERT_COMMON_NAME_INVALID' })));

    await expect(service.login({ email: 'test@example.com', password: '12345678' }))
      .rejects.toThrow('No se pudo establecer una conexión segura con el servidor. Verifica el certificado SSL del API.');

    expect(service.error()).toBe('No se pudo establecer una conexión segura con el servidor. Verifica el certificado SSL del API.');
  });

  it('should preserve register validation issues for field-level handling', async () => {
    const issues = [{ path: ['email'], validation: 'email', message: 'Invalid email' }];
    apiMock.post.mockReturnValue(throwError(() => ({ status: 400, message: 'Validation failed', issues })));

    await expect(service.register({
      email: 'invalid',
      password: '12345678',
      firstName: 'Test',
      lastName: 'User',
    })).rejects.toMatchObject({
      message: 'Ingresa un email válido',
      status: 400,
      issues,
    });

    expect(service.error()).toBe('Ingresa un email válido');
  });

  it('should refresh persisted sessions in localStorage', async () => {
    localStorage.setItem('auth_token', 'old-access-token');
    localStorage.setItem('refresh_token', 'old-refresh-token');
    apiMock.post.mockReturnValue(of({
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    }));

    await expect(service.refreshToken()).resolves.toBe(true);

    expect(apiMock.post).toHaveBeenCalledWith('/api/auth/refresh-token', { refreshToken: 'old-refresh-token' });
    expect(localStorage.getItem('auth_token')).toBe('new-access-token');
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should clear persisted tokens when refresh fails', async () => {
    localStorage.setItem('auth_token', 'old-access-token');
    localStorage.setItem('refresh_token', 'old-refresh-token');
    apiMock.post.mockReturnValue(throwError(() => ({ status: 401, message: 'Unauthorized' })));

    await expect(service.refreshToken()).resolves.toBe(false);

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should validate a persisted session before reporting it as authenticated', async () => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem('auth_token', 'old-access-token');
    localStorage.setItem('refresh_token', 'old-refresh-token');

    const startupApiMock = {
      post: jest.fn().mockReturnValue(of({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      })),
      get: jest.fn().mockReturnValue(of({ success: true, data: null })),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Api,
          useValue: startupApiMock,
        }
      ]
    });

    const startupService = TestBed.inject(Auth);

    expect(startupService.isAuthenticated()).toBe(false);
    await expect(startupService.ensureSession()).resolves.toBe(true);
    expect(startupService.isAuthenticated()).toBe(true);
  });
});
