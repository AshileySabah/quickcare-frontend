import { Component, ElementRef, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface MultiSelectOption {
  value: string;
  label: string;
}

let nextId = 0;

@Component({
  selector: 'ui-multi-select',
  standalone: true,
  templateUrl: './multi-select.component.html',
  styleUrl: './multi-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectComponent),
      multi: true,
    },
  ],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class MultiSelectComponent implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  label = input.required<string>();
  options = input<MultiSelectOption[]>([]);
  placeholder = input('Selecione as opções');
  required = input(false);
  errorMessage = input<string | null>(null);
  hint = input<string | null>(null);

  protected readonly labelId = `ui-multi-select-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly value = signal<string[]>([]);
  protected readonly disabled = signal(false);

  protected readonly selectedOptions = computed(() =>
    this.options().filter((option) => this.value().includes(option.value)),
  );

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[]): void {
    this.value.set(value ?? []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected toggleOpen(): void {
    if (this.disabled()) {
      return;
    }

    this.open.update((open) => !open);

    if (!this.open()) {
      this.onTouched();
    }
  }

  protected isSelected(optionValue: string): boolean {
    return this.value().includes(optionValue);
  }

  protected toggleOption(optionValue: string): void {
    const current = this.value();
    const next = current.includes(optionValue)
      ? current.filter((value) => value !== optionValue)
      : [...current, optionValue];

    this.value.set(next);
    this.onChange(next);
  }

  protected removeOption(optionValue: string, event: Event): void {
    event.stopPropagation();
    this.toggleOption(optionValue);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.onTouched();
    }
  }
}
