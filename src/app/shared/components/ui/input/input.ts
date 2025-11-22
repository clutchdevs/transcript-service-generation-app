import { Component, Input as AngularInput, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
export type InputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './input.html',
  styleUrl: './input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ]
})
export class InputComponent implements ControlValueAccessor {
  @AngularInput() type: InputType = 'text';
  @AngularInput() placeholder = '';
  @AngularInput() label = '';
  @AngularInput() size: InputSize = 'md';
  @AngularInput() disabled = false;
  @AngularInput() required = false;
  @AngularInput() error = '';
  @AngularInput() icon?: string;
  @AngularInput() iconPosition: 'left' | 'right' = 'left';
  @AngularInput() showPasswordToggle = false;
  @AngularInput() autocomplete?: string;

  value = signal('');
  showPassword = signal(false);
  touched = signal(false);

  // ControlValueAccessor implementation
  onChange = (value: string) => {};
  onTouched = () => {};

  writeValue(value: string): void {
    this.value.set(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  onBlur(): void {
    this.touched.set(true);
    this.onTouched();
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  onTogglePassword(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.togglePasswordVisibility();
  }

  get inputClasses(): string {
    const baseClasses = 'appearance-none relative block w-full border rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 transition-colors duration-200';

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-3 py-3 text-sm',
      lg: 'px-4 py-4 text-base'
    };

    const stateClasses = this.touched() && this.error ? 'border-red-300 bg-red-50' : 'border-gray-300';

    const iconClasses = this.icon ? (this.iconPosition === 'left' ? 'pl-10' : 'pr-10') : '';
    const passwordToggleClasses = this.showPasswordToggle && this.type === 'password' ? 'pr-10' : '';

    return `${baseClasses} ${sizeClasses[this.size]} ${stateClasses} ${iconClasses} ${passwordToggleClasses}`;
  }

  get inputType(): string {
    if (this.type === 'password' && this.showPassword()) {
      return 'text';
    }
    return this.type;
  }

  get autocompleteValue(): string {
    // If autocomplete is explicitly provided, use it
    if (this.autocomplete) {
      return this.autocomplete;
    }

    // Auto-generate based on input type
    switch (this.type) {
      case 'password':
        // Default to 'current-password' for password fields
        // Can be overridden by passing autocomplete="new-password" for registration
        return 'current-password';
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      case 'search':
        return 'search';
      default:
        return 'off'; // Disable autocomplete for generic text inputs
    }
  }
}
