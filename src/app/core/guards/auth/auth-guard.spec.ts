import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { authGuard } from './auth.guard';
import { Auth } from '../../services/auth/auth';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
      TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  let authService: jest.Mocked<Auth>;

  beforeEach(() => {
    const isAuthenticatedFn = jest.fn(() => false);
    const authSpy = {
      isAuthenticated: isAuthenticatedFn as unknown as () => boolean,
      ensureProfile: jest.fn()
    } as unknown as jest.Mocked<Auth>;

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: Auth, useValue: authSpy }
      ]
    });

    authService = TestBed.inject(Auth) as jest.Mocked<Auth>;
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow access when user is authenticated', () => {
    (authService.isAuthenticated as unknown as jest.Mock<boolean, []>).mockReturnValue(true);
    const result = executeGuard({} as any, {} as any);
    expect(result).toBe(true);
    expect(authService.ensureProfile).toHaveBeenCalled();
  });

  it('should deny access when user is not authenticated', () => {
    (authService.isAuthenticated as unknown as jest.Mock<boolean, []>).mockReturnValue(false);
    const result = executeGuard({} as any, {} as any);
    expect(result).toBe(false);
    expect(authService.ensureProfile).not.toHaveBeenCalled();
  });
});
