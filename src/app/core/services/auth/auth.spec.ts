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
});
