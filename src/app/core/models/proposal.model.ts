import { RequestStatus, RequestedProfessional, ServiceModality } from './service-request.model';
import { Specialty } from './specialty.model';
import { ProfessionalCategory } from './user.model';

export type ProposalStatus = 'pendente' | 'aceita' | 'recusada' | 'cancelada';

/** Quem enviou a proposta, como o paciente vê. */
export interface ProposalProfessional {
  id: string;
  name: string;
  category: ProfessionalCategory;
  categoryLabel: string;
  specialties: Specialty[];
}

/** A solicitação da proposta, como o profissional vê em "Minhas propostas". */
export interface ProposalRequestSummary {
  id: string;
  patientName: string;
  professionals: RequestedProfessional[];
  modality: ServiceModality;
  desiredDeadline: string;
  status: RequestStatus;
}

export interface Proposal {
  id: string;
  requestId: string;
  professionalId: string;
  professional: ProposalProfessional;
  request: ProposalRequestSummary;
  price: number;
  approach: string;
  deadline: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}
