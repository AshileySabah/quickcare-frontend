import { Address, Gender, IdentityDocumentType, ProfessionalCategory, ValidationStatus } from './user.model';

export type ValidationProfile = 'patient' | 'professional';

export type ValidationStepType = 'CPF' | 'IDENTIDADE' | 'CNPJ' | 'REGISTRO_PROFISSIONAL';

export type ValidationStepStatus = 'pendente' | 'aprovada' | 'reprovada';

export type PreValidationOpinion = 'favoravel' | 'desfavoravel' | 'indisponivel' | 'sem-api';

export interface StoredFile {
  fileName: string;
  contentType: string;
  sizeBytes: number | null;
  sentAt: string | null;
  url: string | null;
}

export interface ValidationStep {
  id: string;
  type: ValidationStepType;
  label: string;
  status: ValidationStepStatus;
  justification: string | null;
  document: StoredFile | null;
  attachment: StoredFile | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  history: ValidationStep[];
}

export interface RegistrationData {
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  cpf: string;
  birthDate: string;
  gender: Gender;
  identityDocumentType: IdentityDocumentType | null;
  identityDocumentNumber: string | null;
  identityDocumentUf: string | null;
  address: Address;
  category: ProfessionalCategory | null;
  specialties: string[];
  cnpj: string | null;
  registrationNumber: string | null;
  registrationUf: string | null;
}

export interface ValidationDetail {
  id: string;
  profile: ValidationProfile;
  status: ValidationStatus;
  revalidating: boolean;
  registeredAt: string;
  data: RegistrationData;
  steps: ValidationStep[];
}

export interface ValidationSummary {
  id: string;
  profile: ValidationProfile;
  name: string;
  email: string;
  category: ProfessionalCategory | null;
  status: ValidationStatus;
  revalidating: boolean;
  registeredAt: string;
  pendingSteps: number;
}

export interface ExternalCheck {
  field: string;
  provider: string | null;
  opinion: PreValidationOpinion;
  reasons: string[];
  notes: string[];
}

export interface PreValidationResult {
  stepType: ValidationStepType;
  opinion: PreValidationOpinion;
  checks: ExternalCheck[];
  suggestedJustification: string;
  checkedAt: string;
}

export interface StepDecision {
  decision: 'aprovada' | 'reprovada';
  justification: string;
  attachment?: File;
}

export interface StepResubmission {
  cpf?: string;
  identityDocumentType?: IdentityDocumentType;
  identityDocumentNumber?: string;
  identityDocumentUf?: string;
  birthDate?: string;
  gender?: Gender;
  cnpj?: string;
  registrationNumber?: string;
  registrationUf?: string;
  document?: File;
}
