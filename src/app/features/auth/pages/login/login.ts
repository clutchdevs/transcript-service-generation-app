import { Component, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Button } from '../../../../shared/components/ui/button/button';
import { InputComponent } from '../../../../shared/components/ui/input/input';
import { Auth, LoginRequest } from '../../../../core/services/auth/auth';
import { NavigationService } from '../../../../core/services/navigation/navigation';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, Button, InputComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private navigation = inject(NavigationService);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  // Form
  loginForm: FormGroup;

  // Success message signal
  private successMessage = signal<string | null>(null);

  // Computed signals for reactive UI - direct from Auth service
  readonly isLoading = computed(() => this.auth.isLoading());
  readonly error = computed(() => this.auth.error());
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  readonly success = computed(() => this.successMessage());

  // Form validation signal
  private formValid = signal(false);
  readonly isFormValid = computed(() => this.formValid());

  // Signals to track form control status for reactivity
  private emailTouched = signal(false);
  private passwordTouched = signal(false);

  // Error messages - computed only when needed
  readonly emailError = computed(() => {
    const emailControl = this.loginForm?.get('email');
    // Check the signal to make this reactive
    if (this.emailTouched() && emailControl?.errors) {
      if (emailControl.errors['required']) return 'El email es requerido';
      if (emailControl.errors['email']) return 'Ingresa un email válido';
    }
    return '';
  });

  readonly passwordError = computed(() => {
    const passwordControl = this.loginForm?.get('password');
    // Check the signal to make this reactive
    if (this.passwordTouched() && passwordControl?.errors) {
      if (passwordControl.errors['required']) return 'La contraseña es requerida';
      if (passwordControl.errors['minlength']) return 'La contraseña debe tener al menos 8 caracteres';
    }
    return '';
  });

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });

    // Clear any existing errors when component initializes
    this.auth.clearError();

    // Single effect to handle successful authentication
    effect(() => {
      if (this.isAuthenticated()) {
        this.handleSuccessfulLogin();
      }
    });

    // Subscribe to form changes with proper cleanup
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Update form validity signal
        this.formValid.set(this.loginForm.valid);
      });

    // Subscribe to email control status changes
    this.loginForm.get('email')?.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.emailTouched.set(this.loginForm.get('email')?.touched || false);
      });

    // Subscribe to password control status changes
    this.loginForm.get('password')?.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.passwordTouched.set(this.loginForm.get('password')?.touched || false);
      });

    // Initial form validity check
    this.formValid.set(this.loginForm.valid);

    // Check for registration success message
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true' && params['email']) {
        this.successMessage.set(`¡Cuenta creada exitosamente! Por favor inicia sesión con tu email: ${params['email']}`);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      const credentials: LoginRequest = {
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value,
        rememberMe: this.loginForm.get('rememberMe')?.value
      };

      try {
        await this.auth.login(credentials);
        // Navigation is handled by the effect
      } catch (error) {
        // Error is handled by the Auth service
        console.error('Login failed:', error);
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Handle successful login
   */
  private handleSuccessfulLogin(): void {
    this.navigation.goToDashboard();
  }

  /**
   * Navigate to register page
   */
  goToRegister(): void {
    this.navigation.goToRegister();
  }

  /**
   * Navigate to forgot password page
   */
  goToForgotPassword(): void {
    this.navigation.goToForgotPassword();
  }

  /**
   * Mark all form controls as touched to trigger validation display
   */
  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Clear form error when user starts typing
   */
  onInputChange(): void {
    // Clear any existing error when user starts typing
    if (this.error()) {
      // Trigger form validation to clear errors
      this.loginForm.updateValueAndValidity();
    }
  }
}
