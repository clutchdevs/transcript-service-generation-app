import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Auth, ResetPasswordRequest } from '../../../../core/services/auth/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword implements OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  resetForm: FormGroup;
  private formValid = signal(false);
  private isSuccess = signal(false);
  private token = signal<string | null>(null);

  // Computed signals from Auth service
  readonly isLoading = computed(() => this.auth.isLoading());
  readonly error = computed(() => this.auth.error());
  readonly isFormValid = computed(() => this.formValid());
  readonly resetSuccess = computed(() => this.isSuccess());
  readonly hasToken = computed(() => !!this.token());

  // Computed signals for validation errors
  readonly passwordError = computed(() => {
    const passwordControl = this.resetForm.get('password');
    if (passwordControl?.touched && passwordControl?.errors) {
      if (passwordControl.errors['required']) return 'La contraseña es requerida';
      if (passwordControl.errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';
    }
    return '';
  });

  readonly confirmPasswordError = computed(() => {
    const confirmPasswordControl = this.resetForm.get('confirmPassword');
    if (confirmPasswordControl?.touched && confirmPasswordControl?.errors) {
      if (confirmPasswordControl.errors['required']) return 'Confirma tu contraseña';
      if (confirmPasswordControl.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  });

  constructor() {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Clear any existing errors when component initializes
    this.auth.clearError();

    // Extract token from URL query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const token = params['token'];
        if (token) {
          this.token.set(token);
        } else {
          // No token provided, redirect to forgot password
          this.router.navigate(['/auth/forgot-password']);
        }
      });

    // Subscribe to form changes to update validation state
    this.resetForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formValid.set(this.resetForm.valid);
      });

    this.formValid.set(this.resetForm.valid);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.valid && this.token()) {
      const password = this.resetForm.get('password')?.value;

      try {
        const resetData: ResetPasswordRequest = {
          token: this.token()!,
          password: password
        };

        await this.auth.resetPassword(resetData);
        // If no error was thrown, the request was successful
        this.isSuccess.set(true);
      } catch (error) {
        // Error is already handled by the Auth service
        console.error('Password reset failed:', error);
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth']);
  }

  onInputChange(): void {
    // Clear error when user starts typing
    if (this.error()) {
      // Note: We don't have a clearError method in Auth service for this specific case
      // The error will be cleared on the next API call
    }
  }

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

  private markFormGroupTouched(): void {
    Object.keys(this.resetForm.controls).forEach(key => {
      const control = this.resetForm.get(key);
      control?.markAsTouched();
    });
  }
}
