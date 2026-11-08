import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { Address, DocumentType, EmergencyContact, Gender } from '../models';
import { setEmergencyContacts } from './emergency-contact-form';
import { FieldMessages, fieldErrorsFor } from './field-errors';

const ACCOUNT_FIELDS = [
  'name',
  'email',
  'phone',
  'cpf',
  'identityDocumentType',
  'identityDocumentNumber',
  'identityDocumentUf',
  'password',
  'confirmPassword',
];

export function disableAccountFields(form: FormGroup): void {
  ACCOUNT_FIELDS.forEach((field) => form.get(field)?.disable());
}

export const LOCKED_PROFILE_NOTE =
  'Os campos desabilitados fazem parte da validação do cadastro e não podem ser alterados aqui.';

export function lockedDeclarationControls(fb: FormBuilder) {
  return {
    infoConfirmedTrue: fb.nonNullable.control({ value: false, disabled: true }),
    lgpdConsent: fb.nonNullable.control({ value: false, disabled: true }),
  };
}

export const PERSONAL_DOCUMENT_TYPES: DocumentType[] = ['COMPROVANTE_CPF', 'VALIDACAO_CPF'];

export const PERSONAL_DOCUMENT_OPTIONS = [
  { value: 'COMPROVANTE_CPF', label: 'CPF' },
  { value: 'VALIDACAO_CPF', label: 'Documento de identidade' },
];

const MISSING_DOCUMENT_MESSAGES: Partial<Record<DocumentType, string>> = {
  COMPROVANTE_CPF: 'Envie um documento que comprove seu CPF.',
  VALIDACAO_CPF: 'Envie seu documento de identidade (RG ou CNH).',
  VALIDACAO_CNPJ: 'Envie um documento que valide o CNPJ informado.',
  REGISTRO_PROFISSIONAL: 'Envie um documento que valide seu registro profissional.',
};

export function missingDocumentMessage(documents: { type: string }[], required: DocumentType[]): string | null {
  if (documents.some((document) => !document.type)) {
    return 'Escolha o tipo de cada documento enviado.';
  }
  const missing = required.find((type) => !documents.some((document) => document.type === type));
  return missing ? (MISSING_DOCUMENT_MESSAGES[missing] ?? null) : null;
}

const PROFILE_MESSAGES: FieldMessages = {
  cpf: { pattern: 'CPF deve conter 11 dígitos, sem pontuação.' },
  cnpj: { pattern: 'CNPJ deve conter 14 dígitos, sem pontuação.' },
  raioAtendimentoKm: { min: 'Informe um raio de atendimento válido.' },
  infoConfirmedTrue: { required: 'Esta confirmação é obrigatória.' },
  lgpdConsent: { required: 'Esta confirmação é obrigatória.' },
};

export function profileFieldErrorsFor(form: AbstractControl): (fieldName: string) => string | null {
  const fieldError = fieldErrorsFor(form, PROFILE_MESSAGES);
  return (fieldName) => fieldError(fieldName) ?? identityDocumentError(form, fieldName);
}

function identityDocumentError(form: AbstractControl, fieldName: string): string | null {
  if (!form.get(fieldName)?.touched) {
    return null;
  }

  if (fieldName === 'identityDocumentNumber' && form.hasError('identityDocumentInvalid')) {
    return form.getError('identityDocumentInvalid') as string;
  }

  if (fieldName === 'identityDocumentUf' && form.hasError('identityDocumentUfRequired')) {
    return 'Informe a UF que emitiu o RG.';
  }

  return null;
}

export function confirmPasswordError(form: AbstractControl): string | null {
  const control = form.get('confirmPassword');

  if (!control?.touched) {
    return null;
  }

  if (control.hasError('required')) {
    return 'Confirme sua senha.';
  }

  return form.hasError('passwordsMismatch') ? 'As senhas não coincidem.' : null;
}

interface ProfileBaseData {
  birthDate: string;
  gender: Gender;
  emergencyContacts: EmergencyContact[];
  address: Address;
}

export function prefillFromOtherProfile(form: FormGroup, fb: FormBuilder, profile: ProfileBaseData): void {
  setEmergencyContacts(form, fb, profile.emergencyContacts);
  form.patchValue({
    birthDate: profile.birthDate,
    gender: profile.gender,
    address: { ...profile.address, complement: profile.address.complement ?? '' },
  });
}
