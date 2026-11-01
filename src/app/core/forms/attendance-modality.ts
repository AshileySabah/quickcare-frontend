import { AbstractControl, FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AttendanceModality } from '../models';

/**
 * No formulário a modalidade são dois checkboxes (presencial e remoto); para a
 * API é um valor só. O grupo precisa dos controles `attendsPresencial`,
 * `attendsRemoto` e `raioAtendimentoKm`.
 */
export function atLeastOneModalityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const presencial = control.get('attendsPresencial')?.value;
    const remoto = control.get('attendsRemoto')?.value;
    return presencial || remoto ? null : { modalityRequired: true };
  };
}

export function toAttendanceModality(attendsPresencial: boolean, attendsRemoto: boolean): AttendanceModality {
  if (attendsPresencial && attendsRemoto) {
    return 'AMBOS';
  }
  return attendsPresencial ? 'PRESENCIAL' : 'REMOTO';
}

export function fromAttendanceModality(modality: AttendanceModality): { attendsPresencial: boolean; attendsRemoto: boolean } {
  return { attendsPresencial: modality !== 'REMOTO', attendsRemoto: modality !== 'PRESENCIAL' };
}

/** O raio só é obrigatório para quem atende presencialmente. */
export function requireRadiusWhenPresencial(attendsPresencial: FormControl<boolean>, raio: FormControl<number>): void {
  attendsPresencial.valueChanges.subscribe((presencial) => {
    raio.setValidators(presencial ? [Validators.required, Validators.min(1)] : []);
    raio.updateValueAndValidity();
  });
}

/** Mensagem do erro de grupo `modalityRequired`, depois que a pessoa mexeu em algum checkbox. */
export function modalityError(group: AbstractControl): string | null {
  const touched = group.get('attendsPresencial')?.touched || group.get('attendsRemoto')?.touched;
  return touched && group.hasError('modalityRequired') ? 'Selecione ao menos uma modalidade de atendimento.' : null;
}
