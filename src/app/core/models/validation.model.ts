import { Address, Gender, IdentityDocumentType, ProfessionalCategory, ValidationStatus } from './user.model';

export type ValidationProfile = 'patient' | 'professional';

export type ValidationStepType = 'IDENTIDADE' | 'CNPJ' | 'REGISTRO_PROFISSIONAL';

export type ValidationStepStatus = 'pendente' | 'aprovada' | 'reprovada';

/** Parecer de uma consulta automática; nunca decide a etapa, só orienta o admin. */
export type PreValidationOpinion = 'favoravel' | 'desfavoravel' | 'indisponivel' | 'sem-api';

/** Arquivo guardado no storage, com URL assinada temporária (nula se indisponível). */
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
  /** Documento enviado pelo usuário que foi conferido nesta avaliação. */
  document: StoredFile | null;
  /** Evidência anexada pelo admin ao decidir. */
  attachment: StoredFile | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  /** Avaliações anteriores (reprovadas e reenviadas), da mais recente para a mais antiga. */
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
  registeredAt: string;
  pendingSteps: number;
}

export interface ExternalCheck {
  field: string;
  provider: string | null;
  opinion: PreValidationOpinion;
  /** Explicam o parecer. */
  reasons: string[];
  /** Informações auxiliares que não pesam no parecer. */
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

/** Dados corrigidos de uma etapa reprovada; só os campos da etapa são usados. */
export interface StepResubmission {
  name?: string;
  cpf?: string;
  identityDocumentType?: IdentityDocumentType;
  identityDocumentNumber?: string;
  identityDocumentUf?: string;
  cnpj?: string;
  registrationNumber?: string;
  registrationUf?: string;
  document: File;
}
