import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jest.useFakeTimers();

    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add and auto-dismiss a toast', () => {
    service.success('Operación exitosa', 1000);

    expect(service.messages()).toHaveLength(1);
    expect(service.messages()[0].message).toBe('Operación exitosa');
    expect(service.messages()[0].variant).toBe('success');

    jest.advanceTimersByTime(1000);

    expect(service.messages()).toHaveLength(0);
  });

  it('should dismiss a toast manually', () => {
    service.info('Mensaje de prueba', 5000);

    const [toast] = service.messages();
    service.dismiss(toast.id);

    expect(service.messages()).toHaveLength(0);
  });
});
