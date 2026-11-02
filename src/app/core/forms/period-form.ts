import { AbstractControl, FormBuilder, FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ErrorMessages } from './field-errors';

export interface PeriodControls {
  start: FormControl<string>;
  end: FormControl<string>;
}

export const PERIOD_ERROR_MESSAGES: Partial<Record<keyof PeriodControls, ErrorMessages>> = {
  start: { inPast: 'Escolha um início no futuro.' },
  end: { endBeforeStart: 'O término precisa ser depois do início.' },
};

function notInPastValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value && new Date(control.value).getTime() <= Date.now() ? { inPast: true } : null;
}

function endAfterStartValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const start = control.parent?.get('start')?.value as string | undefined;
    return start && control.value && new Date(control.value).getTime() <= new Date(start).getTime()
      ? { endBeforeStart: true }
      : null;
  };
}

export function buildPeriodControls(fb: FormBuilder, initial: { start?: string; end?: string } = {}): PeriodControls {
  const start = fb.nonNullable.control(initial.start ? toLocalInputValue(initial.start) : '', [
    Validators.required,
    notInPastValidator(),
  ]);
  const end = fb.nonNullable.control(initial.end ? toLocalInputValue(initial.end) : '', [
    Validators.required,
    endAfterStartValidator(),
  ]);
  start.valueChanges.subscribe(() => end.updateValueAndValidity({ emitEvent: false }));
  return { start, end };
}

export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}
