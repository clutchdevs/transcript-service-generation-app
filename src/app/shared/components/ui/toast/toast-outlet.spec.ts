import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '../../../../core/services/toast/toast';

import { ToastOutlet } from './toast-outlet';

describe('ToastOutlet', () => {
  let component: ToastOutlet;
  let fixture: ComponentFixture<ToastOutlet>;

  const messages = signal([
    {
      id: 'toast-1',
      message: 'Texto copiado al portapapeles.',
      variant: 'success' as const,
      durationMs: 3000,
    },
  ]);

  const dismiss = jest.fn();

  beforeEach(async () => {
    dismiss.mockClear();

    await TestBed.configureTestingModule({
      imports: [ToastOutlet],
      providers: [
        {
          provide: ToastService,
          useValue: {
            messages,
            dismiss,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastOutlet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render toast message and dismiss it on close click', () => {
    expect(fixture.nativeElement.textContent).toContain('Texto copiado al portapapeles.');

    const closeButton = fixture.nativeElement.querySelector('button[aria-label="Cerrar notificación"]') as HTMLButtonElement;
    closeButton.click();

    expect(dismiss).toHaveBeenCalledWith('toast-1');
  });
});
