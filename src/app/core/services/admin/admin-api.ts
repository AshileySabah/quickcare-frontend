import { AdminAction, AdminActionType, AdminParty } from '../../models';

/** Pedaços das respostas do admin que se repetem entre disputas, perfis e solicitações. */
export interface ParteApi {
  usuarioId: number;
  nome: string;
  email: string;
}

export interface AcaoAdminApi {
  tipo: string;
  admin?: string;
  detalhe?: string;
  justificativa: string;
  criadoEm: string;
}

export function toParty(parte: ParteApi): AdminParty {
  return { userId: String(parte.usuarioId), name: parte.nome, email: parte.email };
}

export function toAdminAction(acao: AcaoAdminApi): AdminAction {
  return {
    type: acao.tipo.toLowerCase() as AdminActionType,
    admin: acao.admin,
    detail: acao.detalhe,
    justification: acao.justificativa,
    createdAt: acao.criadoEm,
  };
}
