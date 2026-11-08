import { FormArray, FormBuilder } from '@angular/forms';
import {
  PracticeAreaGroup,
  buildPracticeAreaGroup,
  toPracticeAreaInput,
  uniquePracticeAreasValidator,
} from './practice-area-form';

describe('practice-area-form', () => {
  const fb = new FormBuilder();

  it('categoria com registro exige número, UF e documento', () => {
    const group = buildPracticeAreaGroup(fb);
    group.controls.category.setValue('MEDICO');
    group.controls.specialtyIds.setValue(['9']);

    expect(group.valid).toBeFalse();
    expect(group.controls.registrationNumber.hasError('required')).toBeTrue();
    expect(group.controls.document.hasError('required')).toBeTrue();

    group.patchValue({ registrationNumber: '98765', registrationUf: 'SP' });
    group.controls.document.setValue(new File(['x'], 'crm.pdf'));
    expect(group.valid).toBeTrue();
  });

  it('cuidador não pede registro nem documento', () => {
    const group = buildPracticeAreaGroup(fb);
    group.controls.category.setValue('CUIDADOR');
    group.controls.specialtyIds.setValue(['15']);

    expect(group.valid).toBeTrue();
    expect(toPracticeAreaInput(group)).toEqual({
      category: 'CUIDADOR',
      specialtyIds: ['15'],
      registrationNumber: undefined,
      registrationUf: undefined,
      document: undefined,
    });
  });

  it('em Outros profissionais a especialidade única vira a lista', () => {
    const group = buildPracticeAreaGroup(fb);
    group.controls.category.setValue('OUTRO');
    group.controls.specialtySingle.setValue('18');

    expect(group.controls.specialtyIds.value).toEqual(['18']);
  });

  it('trocar a categoria limpa as especialidades', () => {
    const group = buildPracticeAreaGroup(fb);
    group.controls.category.setValue('ENFERMEIRO');
    group.controls.specialtyIds.setValue(['5']);
    group.controls.category.setValue('MEDICO');

    expect(group.controls.specialtyIds.value).toEqual([]);
  });

  it('não deixa repetir a categoria nem a mesma especialidade de Outros', () => {
    const array = new FormArray<PracticeAreaGroup>([buildPracticeAreaGroup(fb), buildPracticeAreaGroup(fb)], {
      validators: uniquePracticeAreasValidator(),
    });
    array.at(0).controls.category.setValue('OUTRO');
    array.at(0).controls.specialtySingle.setValue('18');
    array.at(1).controls.category.setValue('OUTRO');
    array.at(1).controls.specialtySingle.setValue('21');
    expect(array.hasError('duplicatedPracticeArea')).toBeFalse();

    array.at(1).controls.specialtySingle.setValue('18');
    expect(array.hasError('duplicatedPracticeArea')).toBeTrue();

    array.at(0).controls.category.setValue('ENFERMEIRO');
    array.at(1).controls.category.setValue('ENFERMEIRO');
    expect(array.hasError('duplicatedPracticeArea')).toBeTrue();
  });
});
