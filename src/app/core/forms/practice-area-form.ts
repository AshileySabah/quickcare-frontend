import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { PracticeAreaInput, ProfessionalCategory, practiceAreaRequiresRegistration } from '../models';

export type PracticeAreaGroup = FormGroup<{
  category: FormControl<ProfessionalCategory | ''>;
  specialtyIds: FormControl<string[]>;
  specialtySingle: FormControl<string>;
  registrationNumber: FormControl<string>;
  registrationUf: FormControl<string>;
  document: FormControl<File | null>;
}>;

const UF_PATTERN = /^[A-Za-z]{2}$/;

export function buildPracticeAreaGroup(fb: FormBuilder, withDocument = true): PracticeAreaGroup {
  const group: PracticeAreaGroup = fb.nonNullable.group({
    category: fb.nonNullable.control<ProfessionalCategory | ''>('', Validators.required),
    specialtyIds: fb.nonNullable.control<string[]>([], Validators.required),
    specialtySingle: fb.nonNullable.control(''),
    registrationNumber: fb.nonNullable.control(''),
    registrationUf: fb.nonNullable.control('', Validators.pattern(UF_PATTERN)),
    document: new FormControl<File | null>(null),
  });

  group.controls.category.valueChanges.subscribe((category) => {
    group.controls.specialtyIds.setValue([]);
    group.controls.specialtySingle.setValue('');
    const required = practiceAreaRequiresRegistration(category);
    group.controls.registrationNumber.setValidators(required ? [Validators.required, Validators.maxLength(50)] : []);
    group.controls.registrationUf.setValidators(
      required ? [Validators.required, Validators.pattern(UF_PATTERN)] : [Validators.pattern(UF_PATTERN)],
    );
    group.controls.document.setValidators(required && withDocument ? [Validators.required] : []);
    group.controls.registrationNumber.updateValueAndValidity();
    group.controls.registrationUf.updateValueAndValidity();
    group.controls.document.updateValueAndValidity();
  });

  group.controls.specialtySingle.valueChanges.subscribe((specialtyId) => {
    if (group.controls.category.value === 'OUTRO') {
      group.controls.specialtyIds.setValue(specialtyId ? [specialtyId] : []);
    }
  });

  return group;
}

export function toPracticeAreaInput(group: PracticeAreaGroup): PracticeAreaInput {
  const { category, specialtyIds, registrationNumber, registrationUf, document } = group.getRawValue();
  const required = practiceAreaRequiresRegistration(category);
  return {
    category: category as ProfessionalCategory,
    specialtyIds,
    registrationNumber: required ? registrationNumber.trim() : undefined,
    registrationUf: required ? registrationUf.toUpperCase() : undefined,
    document: required ? (document ?? undefined) : undefined,
  };
}

export function practiceAreaKey(category: ProfessionalCategory | '', specialtyIds: string[]): string | null {
  if (!category) {
    return null;
  }
  return category === 'OUTRO' ? (specialtyIds[0] ? `OUTRO:${specialtyIds[0]}` : null) : category;
}

export function uniquePracticeAreasValidator(existingKeys: () => string[] = () => []): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const groups = (control as FormArray<PracticeAreaGroup>).controls;
    const seen = new Set(existingKeys());
    for (const group of groups) {
      const key = practiceAreaKey(group.controls.category.value, group.controls.specialtyIds.value);
      if (!key) {
        continue;
      }
      if (seen.has(key)) {
        return { duplicatedPracticeArea: true };
      }
      seen.add(key);
    }
    return null;
  };
}

export const PRACTICE_AREA_MESSAGES = {
  category: { required: 'Selecione uma categoria profissional.' },
  specialtyIds: { required: 'Selecione ao menos uma especialidade.' },
  specialtySingle: { required: 'Selecione a especialidade.' },
  registrationNumber: { required: 'Informe o número de registro profissional.' },
  registrationUf: { required: 'Informe a UF do registro.', pattern: 'UF inválida.' },
  document: { required: 'Envie o documento do registro desta atuação.' },
};
