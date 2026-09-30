import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function atLeastOneModalityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const presencial = control.get('attendsPresencial')?.value;
    const remoto = control.get('attendsRemoto')?.value;
    return presencial || remoto ? null : { modalityRequired: true };
  };
}
