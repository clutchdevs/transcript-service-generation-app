import { TestBed } from '@angular/core/testing';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { authGuard, guestGuard } from './auth.guard';
import { Auth } from '../../services/auth/auth';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
      TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const executeGuestGuard: CanMatchFn = (...guardParameters) =>
      TestBed.runInInjectionContext(() => guestGuard(...guardParameters));

  let authService: jest.Mocked<Auth>;
  let router: Router;

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
    router = TestBed.inject(Router);
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

  it('should redirect to auth when user is not authenticated', () => {
    (authService.isAuthenticated as unknown as jest.Mock<boolean, []>).mockReturnValue(false);
    const result = executeGuard({} as any, {} as any) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/auth');
    expect(authService.ensureProfile).not.toHaveBeenCalled();
  });

  it('should allow auth routes when user is not authenticated', () => {
    (authService.isAuthenticated as unknown as jest.Mock<boolean, []>).mockReturnValue(false);
    const result = executeGuestGuard({} as any, []);
    expect(result).toBe(true);
  });

  it('should redirect auth routes to dashboard when user is authenticated', () => {
    (authService.isAuthenticated as unknown as jest.Mock<boolean, []>).mockReturnValue(true);
    const result = executeGuestGuard({} as any, []) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/dashboard');
  });
});
