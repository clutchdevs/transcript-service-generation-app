import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { ForgotPassword } from './forgot-password';

describe('ForgotPasswordComponent', () => {
  it('should render forgot password form', async () => {
    await render(ForgotPassword, {
      imports: [ReactiveFormsModule],
    });

    expect(screen.getByRole('heading', { name: 'Recuperar contraseña' })).toBeTruthy();
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar instrucciones' })).toBeTruthy();
  });

  it('should show validation errors for invalid email', async () => {
    await render(ForgotPassword, {
      imports: [ReactiveFormsModule],
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('El email es requerido')).toBeTruthy();
    });
  });

  it('should show success message after submit', async () => {
    await render(ForgotPassword, {
      imports: [ReactiveFormsModule],
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    fireEvent.input(emailInput, { target: { value: 'test@email.com' } });
    fireEvent.blur(emailInput);

    const submitButton = screen.getByRole('button', { name: 'Enviar instrucciones' });
    fireEvent.click(submitButton);

    // Wait for the loading to finish and the success message to appear
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('¡Revisa tu correo!'))).toBeTruthy();
    }, { timeout: 3000 });
  });
});
