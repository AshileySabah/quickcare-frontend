import { Attendance, AttendanceProblem, AttendanceSide, AttendanceStatus, ProblemDecision, ProblemReason, ProblemStatus } from './attendance.model';
import { Block, Occurrence } from './occurrence.model';
import { ProposalStatus } from './proposal.model';
import { RequestStatus, ServiceModality, ServiceRequest } from './service-request.model';
import { SwitchableRole, ValidationStatus } from './user.model';

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
  | 'motivo_bloqueio_aceito'
  | 'motivo_bloqueio_negado'
  | 'bloqueio_removido'
  | 'bloqueio_aplicado'
  | 'bloqueio_usuario_criado'
  | 'bloqueio_usuario_removido'
  | 'proposta_recusada'
  | 'proposta_cancelada'
  | 'proposta_reativada'
  | 'disputa_decidida'
  | 'solicitacao_reaberta'
  | 'solicitacao_concluida'
  | 'solicitacao_cancelada'
  | 'denuncia_em_analise'
  | 'denuncia_procedente'
  | 'denuncia_improcedente';

export const ADMIN_ACTION_LABELS: Record<AdminActionType, string> = {
  ocorrencia_lancada: 'Ocorrência lançada',
  ocorrencia_anulada: 'Ocorrência anulada',
  recurso_aceito: 'Recurso aceito (ocorrência anulada)',
  recurso_negado: 'Recurso negado (ocorrência mantida)',
  motivo_bloqueio_aceito: 'Motivo de bloqueio aceito (sem ocorrência)',
  motivo_bloqueio_negado: 'Motivo de bloqueio negado (ocorrência lançada)',
  bloqueio_removido: 'Bloqueio removido',
  bloqueio_aplicado: 'Bloqueio aplicado pelo administrador',
  bloqueio_usuario_criado: 'Bloqueio entre usuários criado',
  bloqueio_usuario_removido: 'Bloqueio entre usuários removido',
  proposta_recusada: 'Proposta recusada',
  proposta_cancelada: 'Proposta cancelada',
  proposta_reativada: 'Proposta reativada',
  disputa_decidida: 'Disputa decidida',
  solicitacao_reaberta: 'Solicitação reaberta',
  solicitacao_concluida: 'Solicitação concluída',
  solicitacao_cancelada: 'Solicitação cancelada',
  denuncia_em_analise: 'Análise da denúncia iniciada',
  denuncia_procedente: 'Denúncia julgada procedente',
  denuncia_improcedente: 'Denúncia julgada improcedente',
};

export interface AdminAction {
  type: AdminActionType;
  admin?: string;
  detail?: string;
  justification: string;
  createdAt: string;
}

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
  occurrenceFor: AttendanceSide[];
  justification: string;
}

export type ProfileSituation = 'todos' | 'com_ocorrencias' | 'com_recurso' | 'bloqueados';

export interface AdminProfileSummary {
  userId: string;
  role: SwitchableRole;
  name: string;
  email: string;
  validationStatus: ValidationStatus;
  banned: boolean;
  counting: number;
  openAppeals: number;
  block?: Block;
}

export type BlockReasonStatus = 'em_analise' | 'aceito' | 'negado';

export const BLOCK_REASON_STATUS_LABELS: Record<BlockReasonStatus, string> = {
  em_analise: 'Em análise',
  aceito: 'Aceito, sem ocorrência',
  negado: 'Negado, ocorrência lançada',
};

export interface LateBlockReason {
  id: string;
  status: BlockReasonStatus;
  text: string;
  blockedName: string;
  requestId: string;
  service: string;
  attendanceStart: string;
  acceptedAt: string;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionJustification?: string;
}

export interface AdminProfileDetail {
  summary: AdminProfileSummary;
  limit: number;
  windowDays: number;
  occurrences: Occurrence[];
  blocks: Block[];
  blockReasons: LateBlockReason[];
  actions: AdminAction[];
}

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

export type AdminProposalAction = 'recusar' | 'cancelar' | 'reativar';

export const ADMIN_PROPOSAL_ACTION_LABELS: Record<AdminProposalAction, string> = {
  recusar: 'Recusar',
  cancelar: 'Cancelar',
  reativar: 'Reativar',
};

export interface AdminProposalSummary {
  id: string;
  status: ProposalStatus;
  requestId: string;
  requestStatus: RequestStatus;
  service: string;
  patient: AdminParty;
  professional: AdminParty;
  price: number;
  start: string;
  end: string;
  attendanceStatus?: AttendanceStatus;
  allowedActions: AdminProposalAction[];
  createdAt: string;
}

export type UserBlockAuthor = 'paciente' | 'profissional' | 'admin';

export const USER_BLOCK_AUTHOR_LABELS: Record<UserBlockAuthor, string> = {
  paciente: 'Bloqueado pelo paciente',
  profissional: 'Bloqueado pelo profissional',
  admin: 'Bloqueado pelo administrador',
};

export interface AdminUserBlock {
  id: string;
  patient: AdminParty;
  professional: AdminParty;
  blockedBy: UserBlockAuthor;
  createdBy?: string;
  justification?: string;
  createdAt: string;
}
