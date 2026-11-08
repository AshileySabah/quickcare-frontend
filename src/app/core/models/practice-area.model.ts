import { Specialty } from './specialty.model';
import { ProfessionalCategory } from './user.model';
import { ValidationStepStatus } from './validation.model';

export interface PracticeArea {
  id: string;
  category: ProfessionalCategory;
  categoryLabel: string;
  label: string;
  registrationLabel: string | null;
  specialties: Specialty[];
  registrationNumber: string | null;
  registrationUf: string | null;
}

export interface MyPracticeArea {
  area: PracticeArea;
  registrationStatus: ValidationStepStatus | null;
  released: boolean;
}

export interface PracticeAreaInput {
  category: ProfessionalCategory;
  specialtyIds: string[];
  registrationNumber?: string;
  registrationUf?: string;
  document?: File;
}

export interface AffectedProposal {
  proposalId: string;
  requestId: string;
  service: string;
  status: 'pendente' | 'aceita';
  startsAt: string;
  endsAt: string;
  createsOccurrence: boolean;
}

export interface PracticeAreaImpact {
  allowed: boolean;
  blocker: string | null;
  proposals: AffectedProposal[];
}

export function practiceAreaRequiresRegistration(category: ProfessionalCategory | ''): boolean {
  return category !== '' && category !== 'CUIDADOR';
}
