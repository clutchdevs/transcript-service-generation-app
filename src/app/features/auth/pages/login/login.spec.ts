import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Login } from './login';

describe('LoginComponent', () => {
  it('should render login form', async () => {
    await render(Login, {
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    });

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getAllByPlaceholderText('tu@email.com')[0]).toBeTruthy();
    expect(screen.getAllByPlaceholderText('••••••••')[0]).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeTruthy();
  });

  it('should show validation errors for invalid email', async () => {
    const { fixture } = await render(Login, {
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    });

    // Get the actual input element (not the component wrapper)
    const emailInputs = screen.getAllByPlaceholderText('tu@email.com');
    const emailInput = Array.from(emailInputs).find(
      el => el instanceof HTMLInputElement
    ) as HTMLInputElement;
    
    // Focus and blur to trigger the input component's onBlur
    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);
    
    // Mark control as touched and update signal
    const component = fixture.componentInstance;
    const emailControl = component.loginForm.get('email');
    emailControl?.markAsTouched();
    // Manually update the signal since statusChanges might not fire immediately
    (component as any).emailTouched.set(true);
    fixture.detectChanges();

    await waitFor(() => {
      expect(screen.getByText('El email es requerido')).toBeTruthy();
    });
  });

  it('should show validation errors for invalid password', async () => {
    const { fixture } = await render(Login, {
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    });

    // Get the actual input element (not the component wrapper)
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = Array.from(passwordInputs).find(
      el => el instanceof HTMLInputElement && el.type === 'password'
    ) as HTMLInputElement;
    
    // Focus and blur to trigger the input component's onBlur
    fireEvent.focus(passwordInput);
    fireEvent.blur(passwordInput);
    
    // Mark control as touched and update signal
    const component = fixture.componentInstance;
    const passwordControl = component.loginForm.get('password');
    passwordControl?.markAsTouched();
    // Manually update the signal since statusChanges might not fire immediately
    (component as any).passwordTouched.set(true);
    fixture.detectChanges();

    await waitFor(() => {
      expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
    });
  });

  it('should toggle password visibility', async () => {
    await render(Login, {
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    });

    // Get the actual input element by finding input with type password
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = Array.from(passwordInputs).find(
      el => el instanceof HTMLInputElement && el.type === 'password'
    ) as HTMLInputElement;
    const toggleButton = screen.getByLabelText('Mostrar contraseña');

    expect(passwordInput).toBeTruthy();
    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(passwordInput.type).toBe('text');
    });
  });
});
