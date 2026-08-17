export type ProposalStatus = 'pendente' | 'aceita' | 'recusada' | 'cancelada';

export interface Proposal {
  id: string;
  requestId: string;
  professionalId: string;
  price: number;
  approach: string;
  deadline: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}
