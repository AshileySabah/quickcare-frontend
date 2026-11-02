import { Attendance } from './attendance.model';
import { RequestStatus, RequestedProfessional, ServiceModality } from './service-request.model';
import { Specialty } from './specialty.model';
import { ProfessionalCategory } from './user.model';

export type ProposalStatus = 'pendente' | 'aceita' | 'recusada' | 'cancelada';

/** Por que uma proposta já aceita voltou a aguardar o aceite do paciente. */
export type ReacceptReason = 'proposta_alterada' | 'solicitacao_alterada';

/** Quem enviou a proposta, como o paciente vê. */
export interface ProposalProfessional {
  id: string;
  name: string;
  avatarUrl?: string;
  category: ProfessionalCategory;
  categoryLabel: string;
  specialties: Specialty[];
}

/**
 * A solicitação da proposta, como o profissional vê em "Minhas propostas".
 * Quem é o paciente (id, nome e foto) só vem depois que a proposta é aceita.
 */
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
  /** Período oferecido (ISO); o do atendimento começa igual e muda por remarcação. */
  start: string;
  end: string;
  status: ProposalStatus;
  reacceptReason?: ReacceptReason;
  /** O atendimento mais recente (o ativo, ou o último encerrado); só existe se já foi aceita. */
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

/** Aviso da proposta que voltou a aguardar aceite, do ponto de vista de quem vê. */
export function reacceptNotice(proposal: Proposal, viewer: 'patient' | 'professional'): string | null {
  return proposal.status === 'pendente' && proposal.reacceptReason
    ? REACCEPT_NOTICES[viewer][proposal.reacceptReason]
    : null;
}

/**
 * Só o profissional vê proposta cancelada (o paciente nem recebe), por isso
 * "por você": deixa claro que foi ele quem desistiu, e não o paciente que recusou.
 */
export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  recusada: 'Recusada',
  cancelada: 'Cancelada por você',
};
