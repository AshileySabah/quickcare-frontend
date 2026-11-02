import { AbstractControl, FormBuilder, FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ErrorMessages } from './field-errors';

/** Início e término de um atendimento, em `<input type="datetime-local">` (horário local). */
export interface PeriodControls {
  start: FormControl<string>;
  end: FormControl<string>;
}

export const PERIOD_ERROR_MESSAGES: Partial<Record<keyof PeriodControls, ErrorMessages>> = {
  start: { inPast: 'Escolha um início no futuro.' },
  end: { endBeforeStart: 'O término precisa ser depois do início.' },
};

/** Data e hora já passadas. */
function notInPastValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value && new Date(control.value).getTime() <= Date.now() ? { inPast: true } : null;
}

/** O término compara com o início do mesmo grupo. */
function endAfterStartValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const start = control.parent?.get('start')?.value as string | undefined;
    return start && control.value && new Date(control.value).getTime() <= new Date(start).getTime()
      ? { endBeforeStart: true }
      : null;
  };
}

/** Controles do período; o término é revalidado quando o início muda. */
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

/** ISO → "yyyy-MM-ddTHH:mm" no fuso do navegador, para o input. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** "yyyy-MM-ddTHH:mm" (horário local) → ISO, para a API. */
export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}
