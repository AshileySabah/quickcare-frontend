import { FormBuilder, Validators } from '@angular/forms';

export function buildEmergencyContactGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
  });
}

export type EmergencyContactGroup = ReturnType<typeof buildEmergencyContactGroup>;
