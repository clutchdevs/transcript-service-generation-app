import { Component, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Button } from '../../../../shared/components/ui/button/button';
import { InputComponent } from '../../../../shared/components/ui/input/input';
import { Auth, RegisterRequest } from '../../../../core/services/auth/auth';
import { NavigationService } from '../../../../core/services/navigation/navigation';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, InputComponent],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register implements OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private navigation = inject(NavigationService);
  private destroy$ = new Subject<void>();

  // Form
  registerForm: FormGroup;

  // Form validation signal
  private formValid = signal(false);

  // Computed signals for reactive UI - direct from Auth service
  readonly isLoading = computed(() => this.auth.isLoading());
  readonly error = computed(() => this.auth.error());
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());

  // Form validation - computed only when needed
  readonly isFormValid = computed(() => this.formValid());

  // Error messages - computed only when needed
  readonly firstNameError = computed(() => {
    const firstNameControl = this.registerForm?.get('firstName');
    if (firstNameControl?.touched && firstNameControl?.errors) {
      if (firstNameControl.errors['required']) return 'El nombre es requerido';
      if (firstNameControl.errors['minlength']) return 'El nombre debe tener al menos 2 caracteres';
    }
    return '';
  });

  readonly lastNameError = computed(() => {
    const lastNameControl = this.registerForm?.get('lastName');
    if (lastNameControl?.touched && lastNameControl?.errors) {
      if (lastNameControl.errors['required']) return 'El apellido es requerido';
      if (lastNameControl.errors['minlength']) return 'El apellido debe tener al menos 2 caracteres';
    }
    return '';
  });

  readonly emailError = computed(() => {
    const emailControl = this.registerForm?.get('email');
    if (emailControl?.touched && emailControl?.errors) {
      if (emailControl.errors['required']) return 'El email es requerido';
      if (emailControl.errors['email']) return 'Ingresa un email válido';
    }
    return '';
  });

  readonly passwordError = computed(() => {
    const passwordControl = this.registerForm?.get('password');
    if (passwordControl?.touched && passwordControl?.errors) {
      if (passwordControl.errors['required']) return 'La contraseña es requerida';
      if (passwordControl.errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';
    }
    return '';
  });

  readonly confirmPasswordError = computed(() => {
    const confirmPasswordControl = this.registerForm?.get('confirmPassword');
    if (confirmPasswordControl?.touched && confirmPasswordControl?.errors) {
      if (confirmPasswordControl.errors['required']) return 'Confirma tu contraseña';
      if (confirmPasswordControl.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  });

  constructor() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });



    // Subscribe to form changes with proper cleanup
    this.registerForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Update form validity signal
        this.formValid.set(this.registerForm.valid);
      });

    // Initial form validity check
    this.formValid.set(this.registerForm.valid);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmPassword?.errors?.['passwordMismatch']) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }

    return null;
  }

  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.registerForm.valid) {
      const registerData: RegisterRequest = {
        firstName: this.registerForm.get('firstName')?.value,
        lastName: this.registerForm.get('lastName')?.value,
        email: this.registerForm.get('email')?.value,
        password: this.registerForm.get('password')?.value
      };

      try {
        const userData = await this.auth.register(registerData);
        // Registration successful, navigate to login
        this.handleSuccessfulRegistration();
      } catch (error) {
        // Error is handled by the Auth service
        console.error('Registration failed:', error);
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Handle successful registration
   */
  private handleSuccessfulRegistration(): void {
    // Navigate to login with success message
    this.navigation.navigate('/auth', {
      registered: 'true',
      email: this.registerForm.get('email')?.value
    });
  }

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.navigation.goToLogin();
  }

  /**
   * Mark all form controls as touched to trigger validation display
   */
  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
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
      this.registerForm.updateValueAndValidity();
    }
  }
}
