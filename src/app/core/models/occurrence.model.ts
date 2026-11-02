export type OccurrenceReason =
  | 'cancelamento_atendimento'
  | 'alteracao_tardia_solicitacao'
  | 'nao_comparecimento'
  | 'decisao_disputa'
  | 'manual';

export const OCCURRENCE_REASON_LABELS: Record<OccurrenceReason, string> = {
  cancelamento_atendimento: 'Cancelou um atendimento fora da tolerância de 48h',
  alteracao_tardia_solicitacao: 'Alterou a solicitação a menos de 48h do atendimento',
  nao_comparecimento: 'Não compareceu a um atendimento',
  decisao_disputa: 'Decisão de disputa pelo administrador',
  manual: 'Registrada pelo administrador',
};

export type AppealStatus = 'em_analise' | 'mantida' | 'anulada';

export const APPEAL_STATUS_LABELS: Record<AppealStatus, string> = {
  em_analise: 'Recurso em análise',
  mantida: 'Recurso negado',
  anulada: 'Recurso aceito',
};

/** O usuário discorda da ocorrência (uma vez só); o admin mantém ou anula. */
export interface OccurrenceAppeal {
  id: string;
  status: AppealStatus;
  text: string;
  createdAt: string;
  decidedAt?: string;
  decisionJustification?: string;
  /** Só para o admin. */
  decidedBy?: string;
}

/** Uma falta que conta contra o perfil; anulada pelo admin, deixa de contar. */
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
  /** Só para o admin. */
  createdBy?: string;
  annulledBy?: string;
  /** Ainda dá para recorrer (uma vez, enquanto vale, motivo que admite recurso). */
  canAppeal: boolean;
  appeal?: OccurrenceAppeal;
  /** Entrou num bloqueio que já terminou: não conta mais. */
  alreadyBlocked: boolean;
}

/** Sem criar solicitação (paciente) ou enviar proposta (profissional) até `end`. */
export interface Block {
  id: string;
  level: number;
  start: string;
  end: string;
  active: boolean;
  removedAt?: string;
  removedBy?: string;
  removalJustification?: string;
  /** Desfeito: anularam ocorrência dele e as que sobraram não chegam ao limite. */
  undone: boolean;
  /** Aplicado direto pelo admin (sem as 3 ocorrências): quem e por quê. */
  appliedBy?: string;
  justification?: string;
}

/** O que o próprio perfil vê: quantas contam agora, o limite, o bloqueio atual e o histórico. */
export interface OccurrenceSummary {
  counting: number;
  limit: number;
  windowDays: number;
  block?: Block;
  occurrences: Occurrence[];
}
