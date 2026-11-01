import { FormBuilder } from '@angular/forms';
import {
  atLeastOneModalityValidator,
  fromAttendanceModality,
  modalityError,
  requireRadiusWhenPresencial,
  toAttendanceModality,
} from './attendance-modality';

describe('attendance-modality', () => {
  const fb = new FormBuilder();

  function form() {
    return fb.nonNullable.group(
      { attendsPresencial: [false], attendsRemoto: [false], raioAtendimentoKm: [0] },
      { validators: atLeastOneModalityValidator() },
    );
  }

  it('converte os checkboxes para a modalidade da API e de volta', () => {
    expect(toAttendanceModality(true, true)).toBe('AMBOS');
    expect(toAttendanceModality(true, false)).toBe('PRESENCIAL');
    expect(toAttendanceModality(false, true)).toBe('REMOTO');
    expect(fromAttendanceModality('PRESENCIAL')).toEqual({ attendsPresencial: true, attendsRemoto: false });
    expect(fromAttendanceModality('AMBOS')).toEqual({ attendsPresencial: true, attendsRemoto: true });
  });

  it('exige ao menos uma modalidade, avisando só depois do checkbox ser tocado', () => {
    const group = form();

    expect(group.hasError('modalityRequired')).toBeTrue();
    expect(modalityError(group)).toBeNull();

    group.controls.attendsRemoto.markAsTouched();
    expect(modalityError(group)).toBe('Selecione ao menos uma modalidade de atendimento.');
  });

  it('o raio só é obrigatório para atendimento presencial', () => {
    const group = form();
    requireRadiusWhenPresencial(group.controls.attendsPresencial, group.controls.raioAtendimentoKm);

    expect(group.controls.raioAtendimentoKm.valid).toBeTrue();

    group.controls.attendsPresencial.setValue(true);
    expect(group.controls.raioAtendimentoKm.hasError('min')).toBeTrue();

    group.controls.attendsPresencial.setValue(false);
    expect(group.controls.raioAtendimentoKm.valid).toBeTrue();
  });
});
