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
}

export interface ProfessionalDocument {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  previewUrl: string;
}

export interface Professional extends BaseUser {
  role: 'professional';
  phone: string;
  specialtyId: string;
  registrationNumber: string;
  bio?: string;
  validationStatus: ProfessionalValidationStatus;
  validationDocument: ProfessionalDocument;
  rejectionReason?: string;
}

export interface Admin extends BaseUser {
  role: 'admin';
}

export type User = Patient | Professional | Admin;
