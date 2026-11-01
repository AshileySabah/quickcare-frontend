import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Address, EmergencyContact, Gender } from '../models';
import { EmergencyContactGroup, buildEmergencyContactGroup } from './emergency-contact-form';

interface ProfileBaseData {
  birthDate: string;
  gender: Gender;
  emergencyContacts: EmergencyContact[];
  address: Address;
}

/**
 * Ao criar o outro perfil da conta, começa com o que já foi informado no
 * perfil atual (nascimento, gênero, contatos de emergência e endereço); a
 * pessoa pode alterar antes de enviar.
 */
export function prefillFromOtherProfile(form: FormGroup, fb: FormBuilder, profile: ProfileBaseData): void {
  form.patchValue({
    birthDate: profile.birthDate,
    gender: profile.gender,
    address: { ...profile.address, complement: profile.address.complement ?? '' },
  });

  const contacts = form.get('emergencyContacts') as FormArray<EmergencyContactGroup>;
  contacts.clear();
  for (const contact of profile.emergencyContacts) {
    const group = buildEmergencyContactGroup(fb);
    group.setValue({ name: contact.name, phone: contact.phone });
    contacts.push(group);
  }
}
