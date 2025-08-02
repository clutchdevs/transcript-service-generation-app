import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { Auth } from '../../../../core/services/auth/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  // Computed signals from Auth service
  readonly isLoading = computed(() => this.auth.isLoading());
  readonly error = computed(() => this.auth.error());
  readonly isFormValid = computed(() => this.formValid());
  readonly emailSent = computed(() => this.isSent());

  // Computed signals for validation errors
  readonly emailError = computed(() => {
    const emailControl = this.forgotForm.get('email');
    if (emailControl?.touched && emailControl?.errors) {
      if (emailControl.errors['required']) return 'El email es requerido';
      if (emailControl.errors['email']) return 'Ingresa un email válido';
    }
    return '';
  });

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // Subscribe to form changes to update validation state
    this.forgotForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formValid.set(this.forgotForm.valid);
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
