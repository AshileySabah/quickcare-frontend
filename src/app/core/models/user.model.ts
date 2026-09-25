export type UserRole = 'patient' | 'professional' | 'admin';

export type ProfessionalValidationStatus = 'pendente' | 'aprovado' | 'reprovado';

export type Gender = 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'PREFIRO_NAO_INFORMAR';

export interface EmergencyContact {
  name: string;
  phone: string;
}

export type DocumentType = 'VALIDACAO_CPF' | 'VALIDACAO_CNPJ' | 'REGISTRO_PROFISSIONAL' | 'OUTRO';

export interface RegistrationDocument {
  file: File;
  type: DocumentType;
}

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Patient extends BaseUser {
  role: 'patient';
  phone: string;
  cpf: string;
  birthDate: string;
  gender: Gender;
  emergencyContacts: EmergencyContact[];
  infoConfirmedTrue: boolean;
  lgpdConsent: boolean;
  allergies?: string;
  healthConditions?: string;
  medicationsInUse?: string;
  address: Address;
}

export interface ProfessionalDocument {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  previewUrl: string;
}

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export type ProfessionalCategory = 'MEDICO' | 'ENFERMEIRO' | 'CUIDADOR' | 'OUTRO';

export interface Professional extends BaseUser {
  role: 'professional';
  phone: string;
  cpf: string;
  cnpj?: string;
  category: ProfessionalCategory;
  specialtyIds: string[];
  registrationNumber?: string;
  birthDate: string;
  gender: Gender;
  emergencyContacts: EmergencyContact[];
  infoConfirmedTrue: boolean;
  lgpdConsent: boolean;
  hasLiabilityInsurance: boolean;
  address: Address;
  bio?: string;
  validationStatus: ProfessionalValidationStatus;
  validationDocument: ProfessionalDocument;
  rejectionReason?: string;
}

export interface Admin extends BaseUser {
  role: 'admin';
}

export type User = Patient | Professional | Admin;
