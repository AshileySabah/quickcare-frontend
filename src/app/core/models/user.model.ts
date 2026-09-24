export type UserRole = 'patient' | 'professional' | 'admin';

export type ProfessionalValidationStatus = 'pendente' | 'aprovado' | 'reprovado';

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
