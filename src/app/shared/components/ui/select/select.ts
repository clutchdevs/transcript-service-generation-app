import { Component, Input, Output, EventEmitter, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder = '';
  @Input() label = '';
  @Input() size: SelectSize = 'md';
  @Input() disabled = false;
  @Input() required = false;
  @Input() error = '';
  @Input() showEmptyOption = false;
  @Input() emptyOptionLabel = 'Seleccionar...';

  private _value: string | number = '';
  @Input()
  set value(val: string | number) {
    this._value = val;
    this.valueSignal.set(val || '');
  }
  get value(): string | number {
    return this._value;
  }

  @Output() valueChange = new EventEmitter<string | number>();

  valueSignal = signal<string | number>('');
  touched = signal(false);

  // Accessibility: Unique IDs for label and error message
  private static idCounter = 0;
  readonly selectId = `select-${SelectComponent.idCounter++}`;
  readonly errorId = `select-error-${this.selectId}`;

  // ControlValueAccessor implementation
  onChange = (value: string | number) => {};
  onTouched = () => {};

  writeValue(value: string | number): void {
    this.value = value || '';
    this.valueSignal.set(value || '');
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSelectionChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value;
    this.value = newValue;
    this.valueSignal.set(newValue);
    this.onChange(newValue);
    this.valueChange.emit(newValue);
  }

  onBlur(): void {
    this.touched.set(true);
    this.onTouched();
  }

  get selectClasses(): string {
    const baseClasses = 'appearance-none relative block w-full border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white pr-10 z-10';

    const sizeClasses = {
      sm: 'pl-3 py-2 text-sm',
      md: 'pl-3 py-3 text-sm',
      lg: 'pl-4 py-4 text-base'
    };

    const stateClasses = this.touched() && this.error
      ? 'border-red-300 bg-red-50'
      : this.disabled
        ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
        : 'border-gray-300';

    return `${baseClasses} ${sizeClasses[this.size]} ${stateClasses}`;
  }

  // Accessibility: Check if select has error
  get hasError(): boolean {
    return this.touched() && !!this.error;
  }

  // Accessibility: Get aria-describedby value
  get ariaDescribedBy(): string | null {
    return this.hasError ? this.errorId : null;
  }
}

