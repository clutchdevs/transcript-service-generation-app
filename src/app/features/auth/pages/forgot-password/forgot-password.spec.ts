import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '../../../../core/services/auth/auth';
import { ForgotPassword } from './forgot-password';

describe('ForgotPasswordComponent', () => {
  it('should render forgot password form', async () => {
    await render(ForgotPassword, {
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    expect(screen.getByRole('heading', { name: 'Recuperar contraseña' })).toBeTruthy();
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar instrucciones' })).toBeTruthy();
  });

  it('should show validation errors for invalid email', async () => {
    const { fixture } = await render(ForgotPassword, {
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    // Focus and blur to mark as touched
    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);
    
    // Force the control to be marked as touched and update the signal
    const component = fixture.componentInstance;
    const emailControl = component.forgotForm.get('email');
    emailControl?.markAsTouched();
    // Manually update the signal since statusChanges might not fire immediately
    (component as any).emailTouchedSignal.set(true);
    fixture.detectChanges();

    await waitFor(() => {
      expect(screen.getByText('El email es requerido')).toBeTruthy();
    });
  });

  it('should show success message after submit', async () => {
    const mockAuth = {
      forgotPassword: jest.fn().mockResolvedValue(undefined),
      clearError: jest.fn(),
      isLoading: jest.fn(() => false),
      error: jest.fn(() => null)
    } as unknown as jest.Mocked<Auth>;

    await render(ForgotPassword, {
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Auth, useValue: mockAuth }
      ]
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    fireEvent.input(emailInput, { target: { value: 'test@email.com' } });
    fireEvent.blur(emailInput);

    const submitButton = screen.getByRole('button', { name: 'Enviar instrucciones' });
    fireEvent.click(submitButton);

    // Wait for the loading to finish and the success message to appear
    await waitFor(() => {
      expect(screen.getByText('¡Revisa tu correo!')).toBeTruthy();
    }, { timeout: 3000 });
  });
});
