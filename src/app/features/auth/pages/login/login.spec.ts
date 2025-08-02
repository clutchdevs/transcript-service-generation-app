import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { Login } from './login';

describe('LoginComponent', () => {
  it('should render login form', async () => {
    await render(Login, {
      imports: [ReactiveFormsModule],
    });

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeTruthy();
  });

  it('should show validation errors for invalid email', async () => {
    await render(Login, {
      imports: [ReactiveFormsModule],
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('El email es requerido')).toBeTruthy();
    });
  });

  it('should show validation errors for invalid password', async () => {
    await render(Login, {
      imports: [ReactiveFormsModule],
    });

    const passwordInput = screen.getByLabelText('Contraseña');
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
    });
  });

  it('should toggle password visibility', async () => {
    await render(Login, {
      imports: [ReactiveFormsModule],
    });

    const passwordInput = screen.getByLabelText('Contraseña') as HTMLInputElement;
    const toggleButton = passwordInput.parentElement?.querySelector('button');

    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleButton!);

    await waitFor(() => {
      expect(passwordInput.type).toBe('text');
    });
  });
});
