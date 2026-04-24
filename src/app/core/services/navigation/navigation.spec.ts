import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { NavigationService, ROUTES } from './navigation';

describe('NavigationService', () => {
  let service: NavigationService;
  let routerMock: { navigate: jest.Mock; url: string };

  beforeEach(() => {
    routerMock = {
      navigate: jest.fn(),
      url: '/dashboard/transcriptions',
    };

    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        {
          provide: Router,
          useValue: routerMock,
        },
      ],
    });

    service = TestBed.inject(NavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should navigate to settings', () => {
    service.goToSettings();

    expect(routerMock.navigate).toHaveBeenCalledWith([ROUTES.DASHBOARD.SETTINGS]);
  });

  it('should navigate with query params when provided', () => {
    service.navigate('/auth/reset-password', { token: 'abc' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/reset-password'], {
      queryParams: { token: 'abc' },
    });
  });

  it('should return and match current route', () => {
    expect(service.getCurrentRoute()).toBe('/dashboard/transcriptions');
    expect(service.isCurrentRoute('transcriptions')).toBe(true);
    expect(service.isCurrentRoute('settings')).toBe(false);
  });
});
