import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InputMask, formatMasked, formattedMaxLength, toRawDigits } from './input-mask.util';

let nextId = 0;

@Component({
  selector: 'ui-input',
  standalone: true,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  label = input.required<string>();
  type = input<'text' | 'email' | 'password' | 'number' | 'tel' | 'date'>('text');
  placeholder = input<string>('');
  hint = input<string | null>(null);
  errorMessage = input<string | null>(null);
  required = input(false);
  mask = input<InputMask | null>(null);
  maxLength = input<number | null>(null);
  autocomplete = input<string>('off');
  name = input<string | null>(null);

  protected readonly inputId = `ui-input-${nextId++}`;
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly errorId = `${this.inputId}-error`;

  protected readonly value = signal('');
  protected readonly disabled = signal(false);

  protected readonly displayValue = computed(() => {
    const maskType = this.mask();
    return maskType ? formatMasked(maskType, this.value()) : this.value();
  });

  protected readonly effectiveMaxLength = computed(() => {
    const explicit = this.maxLength();

    if (explicit !== null) {
      return explicit;
    }

    const maskType = this.mask();
    return maskType ? formattedMaxLength(maskType) : null;
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    const maskType = this.mask();
    this.value.set(maskType ? toRawDigits(maskType, value ?? '') : (value ?? ''));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const maskType = this.mask();

    if (maskType) {
      const rawDigits = toRawDigits(maskType, target.value);
      this.value.set(rawDigits);
      target.value = formatMasked(maskType, rawDigits);
      this.onChange(rawDigits);
      return;
    }

    this.value.set(target.value);
    this.onChange(target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
