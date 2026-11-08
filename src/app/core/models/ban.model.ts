import { SwitchableRole } from './user.model';

export type BanType = 'permanente' | 'suspensao';

export type BanEnding = 'removido' | 'expirou' | 'recurso_aceito';

export type BanAppealStatus = 'em_analise' | 'aceito' | 'negado';

export const BAN_APPEAL_LABELS: Record<BanAppealStatus, string> = {
  em_analise: 'Recurso em análise',
  aceito: 'Recurso aceito',
  negado: 'Recurso negado',
};

export const BAN_ENDING_LABELS: Record<BanEnding, string> = {
  removido: 'Removido pelo administrador',
  expirou: 'Suspensão terminou',
  recurso_aceito: 'Recurso aceito',
};

export interface Ban {
  id: string;
  role: SwitchableRole;
  type: BanType;
  start: string;
  end?: string;
  justification: string;
  appliedBy?: string;
  reportId?: string;
  active: boolean;
  canAppeal: boolean;
  endedAt?: string;
  ending?: BanEnding;
  endedBy?: string;
  endingJustification?: string;
  appeal?: {
    status: BanAppealStatus;
    text: string;
    createdAt: string;
    decidedAt?: string;
    decidedBy?: string;
    justification?: string;
  };
}

export interface BanInput {
  type: BanType;
  days?: number;
  bothProfiles: boolean;
  justification: string;
}

export const SUSPENSION_DAY_OPTIONS = [7, 15, 30];
