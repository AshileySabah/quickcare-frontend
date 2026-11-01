import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmergencyContact } from '../models';

export function buildEmergencyContactGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
  });
}

export type EmergencyContactGroup = ReturnType<typeof buildEmergencyContactGroup>;

/** Recria os contatos do `emergencyContacts` do formulário com os valores informados. */
export function setEmergencyContacts(form: FormGroup, fb: FormBuilder, contacts: EmergencyContact[]): void {
  const array = form.get('emergencyContacts') as FormArray<EmergencyContactGroup>;
  array.clear();
  for (const contact of contacts) {
    const group = buildEmergencyContactGroup(fb);
    group.setValue({ name: contact.name, phone: contact.phone });
    array.push(group);
  }
}
