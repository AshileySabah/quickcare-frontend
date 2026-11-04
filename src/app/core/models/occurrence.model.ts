export type OccurrenceReason =
  | 'cancelamento_atendimento'
  | 'alteracao_tardia_solicitacao'
  | 'nao_comparecimento'
  | 'decisao_disputa'
  | 'manual'
  | 'bloqueio_tardio';

export const OCCURRENCE_REASON_LABELS: Record<OccurrenceReason, string> = {
  cancelamento_atendimento: 'Cancelou um atendimento fora da tolerância de 48h',
  alteracao_tardia_solicitacao: 'Alterou a solicitação a menos de 48h do atendimento',
  nao_comparecimento: 'Não compareceu a um atendimento',
  decisao_disputa: 'Decisão de disputa pelo administrador',
  manual: 'Registrada pelo administrador',
  bloqueio_tardio: 'Bloqueou alguém a menos de 48h de um atendimento aceito',
};

export type AppealStatus = 'em_analise' | 'mantida' | 'anulada';

export const APPEAL_STATUS_LABELS: Record<AppealStatus, string> = {
  em_analise: 'Recurso em análise',
  mantida: 'Recurso negado',
  anulada: 'Recurso aceito',
};

export interface OccurrenceAppeal {
  id: string;
  status: AppealStatus;
  text: string;
  createdAt: string;
  decidedAt?: string;
  decisionJustification?: string;
  decidedBy?: string;
}

export interface Occurrence {
  id: string;
  reason: OccurrenceReason;
  createdAt: string;
  requestId?: string;
  attendanceId?: string;
  annulled: boolean;
  annulledAt?: string;
  justification?: string;
  annulmentJustification?: string;
  createdBy?: string;
  annulledBy?: string;
  canAppeal: boolean;
  appeal?: OccurrenceAppeal;
  alreadyBlocked: boolean;
}

export interface Block {
  id: string;
  level: number;
  start: string;
  end: string;
  active: boolean;
  removedAt?: string;
  removedBy?: string;
  removalJustification?: string;
  undone: boolean;
  appliedBy?: string;
  justification?: string;
}

export interface OccurrenceSummary {
  counting: number;
  limit: number;
  windowDays: number;
  block?: Block;
  occurrences: Occurrence[];
}
