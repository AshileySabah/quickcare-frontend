import { SwitchableRole } from './user.model';

export type NotificationType =
  | 'proposta_recebida'
  | 'proposta_alterada'
  | 'proposta_cancelada'
  | 'proposta_aceita'
  | 'proposta_recusada'
  | 'proposta_aguarda_reaceite'
  | 'solicitacao_alterada'
  | 'solicitacao_cancelada'
  | 'solicitacao_concluida'
  | 'cadastro_aprovado'
  | 'etapa_reprovada';

/** Notificação in-app de um dos perfis do usuário. */
export interface AppNotification {
  id: string;
  profile: SwitchableRole;
  type: NotificationType;
  title: string;
  message: string;
  /** Rota do front para onde a notificação leva. */
  link?: string;
  read: boolean;
  createdAt: string;
}

export type UnreadCounts = Record<SwitchableRole, number>;
