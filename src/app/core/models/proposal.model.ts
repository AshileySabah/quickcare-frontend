import { Attendance } from './attendance.model';
import { RequestStatus, RequestedProfessional, ServiceModality } from './service-request.model';
import { Specialty } from './specialty.model';
import { ProfessionalCategory } from './user.model';

export type ProposalStatus = 'pendente' | 'aceita' | 'recusada' | 'cancelada';

export type ReacceptReason = 'proposta_alterada' | 'solicitacao_alterada';

export interface ProposalProfessional {
  id: string;
  name: string;
  avatarUrl?: string;
  category: ProfessionalCategory;
  categoryLabel: string;
  specialties: Specialty[];
}

export interface ProposalRequestSummary {
  id: string;
  patientId?: string;
  patientName?: string;
  patientAvatarUrl?: string;
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
  start: string;
  end: string;
  status: ProposalStatus;
  reacceptReason?: ReacceptReason;
  attendance?: Attendance;
  createdAt: string;
  updatedAt: string;
}

const REACCEPT_NOTICES: Record<'patient' | 'professional', Record<ReacceptReason, string>> = {
  patient: {
    proposta_alterada: 'O profissional alterou esta proposta depois do seu aceite. Aceite de novo para confirmar.',
    solicitacao_alterada: 'Você alterou a solicitação depois de aceitar esta proposta. Aceite de novo para confirmar.',
  },
  professional: {
    proposta_alterada: 'Você alterou a proposta depois do aceite. Ela aguarda um novo aceite do paciente.',
    solicitacao_alterada:
      'O paciente alterou a solicitação depois de aceitar sua proposta. Revise a proposta: ela aguarda um novo aceite.',
  },
};

export function reacceptNotice(proposal: Proposal, viewer: 'patient' | 'professional'): string | null {
  return proposal.status === 'pendente' && proposal.reacceptReason
    ? REACCEPT_NOTICES[viewer][proposal.reacceptReason]
    : null;
}

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  recusada: 'Recusada',
  cancelada: 'Cancelada por você',
};
