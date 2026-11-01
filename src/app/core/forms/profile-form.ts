import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { Address, DocumentType, EmergencyContact, Gender } from '../models';
import { setEmergencyContacts } from './emergency-contact-form';
import { FieldMessages, fieldErrorsFor } from './field-errors';

/** Dados da conta no cadastro; já existem quando quem está logado cria o outro perfil. */
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

/** Desabilitados, os campos da conta saem da validação do formulário de novo perfil. */
export function disableAccountFields(form: FormGroup): void {
  ACCOUNT_FIELDS.forEach((field) => form.get(field)?.disable());
}

const MISSING_DOCUMENT_MESSAGES: Partial<Record<DocumentType, string>> = {
  VALIDACAO_CPF: 'Envie um documento que valide seu CPF.',
  VALIDACAO_CNPJ: 'Envie um documento que valide o CNPJ informado.',
  REGISTRO_PROFISSIONAL: 'Envie um documento que valide seu registro profissional.',
};

/** Mensagem do primeiro documento obrigatório que não foi enviado; nula se estão todos. */
export function missingDocumentMessage(documents: { type: string }[], required: DocumentType[]): string | null {
  const missing = required.find((type) => !documents.some((document) => document.type === type));
  return missing ? (MISSING_DOCUMENT_MESSAGES[missing] ?? null) : null;
}

/** Campos dos cadastros e da edição de perfil (paciente e profissional) com mensagem própria. */
const PROFILE_MESSAGES: FieldMessages = {
  cpf: { pattern: 'CPF deve conter 11 dígitos, sem pontuação.' },
  cnpj: { pattern: 'CNPJ deve conter 14 dígitos, sem pontuação.' },
  category: { required: 'Selecione uma categoria profissional.' },
  specialtyIds: { required: 'Selecione ao menos uma especialidade.' },
  specialtySingle: { required: 'Selecione ao menos uma especialidade.' },
  registrationNumber: { required: 'Informe o número de registro profissional.' },
  raioAtendimentoKm: { min: 'Informe um raio de atendimento válido.' },
  infoConfirmedTrue: { required: 'Esta confirmação é obrigatória.' },
  lgpdConsent: { required: 'Esta confirmação é obrigatória.' },
};

/**
 * O `fieldError` dos formulários de perfil. Além dos erros de cada campo,
 * mostra os de grupo do documento de identidade (número e UF são conferidos
 * juntos pelo `identityDocumentValidator`).
 */
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

/** A confirmação compara com `password` pelo `passwordsMatchValidator` do grupo. */
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

/**
 * Ao criar o outro perfil da conta, começa com o que já foi informado no
 * perfil atual (nascimento, gênero, contatos de emergência e endereço); a
 * pessoa pode alterar antes de enviar.
 */
export function prefillFromOtherProfile(form: FormGroup, fb: FormBuilder, profile: ProfileBaseData): void {
  setEmergencyContacts(form, fb, profile.emergencyContacts);
  form.patchValue({
    birthDate: profile.birthDate,
    gender: profile.gender,
    address: { ...profile.address, complement: profile.address.complement ?? '' },
  });
}
