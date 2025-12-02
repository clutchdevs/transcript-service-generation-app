import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { Auth } from '../../../../core/services/auth/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword implements OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  forgotForm: FormGroup;
  private formValid = signal(false);
  private isSent = signal(false);
  private emailTouchedSignal = signal(false);

  // Computed signals from Auth service
  readonly isLoading = computed(() => this.auth.isLoading());
  readonly error = computed(() => this.auth.error());
  readonly isFormValid = computed(() => this.formValid());
  readonly emailSent = computed(() => this.isSent());

  // Computed signals for validation errors
  readonly emailError = computed(() => {
    const emailControl = this.forgotForm.get('email');
    // Check the signal to make this reactive
    if (this.emailTouchedSignal() && emailControl?.errors) {
      if (emailControl.errors['required']) return 'El email es requerido';
      if (emailControl.errors['email']) return 'Ingresa un email válido';
    }
    return '';
  });

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // Clear any existing errors when component initializes
    this.auth.clearError();

    // Subscribe to form changes to update validation state
    this.forgotForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formValid.set(this.forgotForm.valid);
      });

    // Subscribe to email control status changes
    this.forgotForm.get('email')?.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.emailTouchedSignal.set(this.forgotForm.get('email')?.touched || false);
      });

    this.formValid.set(this.forgotForm.valid);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    if (this.forgotForm.valid) {
      const email = this.forgotForm.get('email')?.value;

      try {
        await this.auth.forgotPassword(email);
        // If no error was thrown, the request was successful
        // Ensure any previous error is cleared before showing success
        this.auth.clearError();
        this.isSent.set(true);
      } catch (error) {
        // Error is already handled by the Auth service
        console.error('Forgot password failed:', error);
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

  private markFormGroupTouched(): void {
    Object.keys(this.forgotForm.controls).forEach(key => {
      const control = this.forgotForm.get(key);
      control?.markAsTouched();
    });
  }
}
