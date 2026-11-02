import { Attendance, AttendanceProblem, AttendanceSide, AttendanceStatus, ProblemDecision, ProblemReason, ProblemStatus } from './attendance.model';
import { Block, Occurrence } from './occurrence.model';
import { ProposalStatus } from './proposal.model';
import { RequestStatus, ServiceModality, ServiceRequest } from './service-request.model';
import { SwitchableRole, ValidationStatus } from './user.model';

/** Uma pessoa envolvida, como o admin vê (com e-mail, para contato). */
export interface AdminParty {
  userId: string;
  name: string;
  email: string;
}

export type AdminActionType =
  | 'ocorrencia_lancada'
  | 'ocorrencia_anulada'
  | 'recurso_aceito'
  | 'recurso_negado'
  | 'bloqueio_removido'
  | 'disputa_decidida'
  | 'solicitacao_reaberta'
  | 'solicitacao_concluida'
  | 'solicitacao_cancelada';

export const ADMIN_ACTION_LABELS: Record<AdminActionType, string> = {
  ocorrencia_lancada: 'Ocorrência lançada',
  ocorrencia_anulada: 'Ocorrência anulada',
  recurso_aceito: 'Recurso aceito (ocorrência anulada)',
  recurso_negado: 'Recurso negado (ocorrência mantida)',
  bloqueio_removido: 'Bloqueio removido',
  disputa_decidida: 'Disputa decidida',
  solicitacao_reaberta: 'Solicitação reaberta',
  solicitacao_concluida: 'Solicitação concluída',
  solicitacao_cancelada: 'Solicitação cancelada',
};

/** Auditoria: o que um admin fez e por quê. */
export interface AdminAction {
  type: AdminActionType;
  admin?: string;
  detail?: string;
  justification: string;
  createdAt: string;
}

// ------------------------------------------------------------- disputas

export interface DisputeSummary {
  id: string;
  status: ProblemStatus;
  attendanceId: string;
  requestId: string;
  service: string;
  start: string;
  end: string;
  patient: AdminParty;
  professional: AdminParty;
  reportedBy: AttendanceSide;
  reason: ProblemReason;
  createdAt: string;
  answerDeadline: string;
  contestedAt?: string;
}

/** Um evento do histórico do atendimento (auditoria). */
export interface AttendanceEvent {
  type: string;
  author?: string;
  start: string;
  end: string;
  detail?: string;
  createdAt: string;
}

export interface DisputeDetail {
  summary: DisputeSummary;
  attendanceStatus: AttendanceStatus;
  statusBeforeReport: AttendanceStatus;
  problem: AttendanceProblem;
  events: AttendanceEvent[];
  actions: AdminAction[];
}

export interface DisputeDecisionInput {
  decision: ProblemDecision;
  /** Quem leva ocorrência: nenhum, um ou os dois. */
  occurrenceFor: AttendanceSide[];
  justification: string;
}

// --------------------------------------------------------------- perfis

export type ProfileSituation = 'todos' | 'com_ocorrencias' | 'com_recurso' | 'bloqueados';

export interface AdminProfileSummary {
  userId: string;
  role: SwitchableRole;
  name: string;
  email: string;
  validationStatus: ValidationStatus;
  banned: boolean;
  counting: number;
  /** Recursos de ocorrência esperando decisão. */
  openAppeals: number;
  block?: Block;
}

export interface AdminProfileDetail {
  summary: AdminProfileSummary;
  limit: number;
  windowDays: number;
  occurrences: Occurrence[];
  blocks: Block[];
  actions: AdminAction[];
}

// ---------------------------------------------------------- solicitações

export type AdminRequestAction = 'reabrir' | 'concluir' | 'cancelar';

export const ADMIN_REQUEST_ACTION_LABELS: Record<AdminRequestAction, string> = {
  reabrir: 'Reabrir',
  concluir: 'Concluir',
  cancelar: 'Cancelar',
};

export interface AdminRequestSummary {
  id: string;
  status: RequestStatus;
  patient: AdminParty;
  service: string;
  modality: ServiceModality;
  city?: string;
  state?: string;
  desiredDate: string;
  slots: number;
  filledSlots: number;
  createdAt: string;
}

export interface AdminProposal {
  id: string;
  professional: AdminParty;
  status: ProposalStatus;
  price: number;
  start: string;
  end: string;
  attendance?: Attendance;
}

export interface AdminRequestDetail {
  summary: AdminRequestSummary;
  request: ServiceRequest;
  proposals: AdminProposal[];
  allowedActions: AdminRequestAction[];
  actions: AdminAction[];
}
