import { FormBuilder, Validators } from '@angular/forms';
import { ProfessionalCategory } from '../models';

export const MAX_PROFESSIONALS_PER_ROW = 10;
export const MAX_REQUESTED_PROFESSIONAL_ROWS = 10;

export function buildRequestedProfessionalGroup(
  fb: FormBuilder,
  value?: { category: ProfessionalCategory; specialtyIds: string[]; quantity: number },
) {
  return fb.nonNullable.group({
    category: fb.nonNullable.control<ProfessionalCategory | ''>(value?.category ?? '', Validators.required),
    specialtyIds: fb.nonNullable.control<string[]>(value?.specialtyIds ?? [], Validators.required),
    quantity: [
      String(value?.quantity ?? 1),
      [Validators.required, Validators.pattern(/^\d+$/), Validators.min(1), Validators.max(MAX_PROFESSIONALS_PER_ROW)],
    ],
  });
}

export type RequestedProfessionalGroup = ReturnType<typeof buildRequestedProfessionalGroup>;
