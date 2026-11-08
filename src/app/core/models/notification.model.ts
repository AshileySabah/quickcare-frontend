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
  | 'reaceite_aceito'
  | 'reaceite_recusado'
  | 'atendimento_substituido'
  | 'remarcacao_solicitada'
  | 'remarcacao_aceita'
  | 'remarcacao_recusada'
  | 'atendimento_cancelado'
  | 'lembrete_atendimento'
  | 'atendimento_finalizado'
  | 'avaliacao_pendente'
  | 'problema_relatado'
  | 'problema_confirmado'
  | 'problema_sem_resposta'
  | 'problema_contestado'
  | 'disputa_decidida'
  | 'ocorrencia_registrada'
  | 'ocorrencia_anulada'
  | 'bloqueio_aplicado'
  | 'bloqueio_removido'
  | 'solicitacao_alterada_admin'
  | 'cadastro_aprovado'
  | 'etapa_reprovada';

export interface AppNotification {
  id: string;
  profile: SwitchableRole;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export type UnreadCounts = Record<SwitchableRole, number>;
