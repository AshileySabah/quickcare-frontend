import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { ProfessionalCategory, Proposal, ProposalStatus, ReacceptReason, RequestStatus } from '../models';
import { AtendimentoApiResponse, toAttendance } from './attendance.service';
import { ProfissionalSolicitadoApi, toRequestedProfessional } from './request.service';

export interface ProposalInput {
  price: number;
  approach: string;
  /** ISO (com fuso); o formulário converte do horário local. */
  start: string;
  end: string;
}

type StatusPropostaApi = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA';

interface PropostaApiResponse {
  id: number;
  solicitacao: {
    id: number;
    /** Só vêm com a proposta aceita. */
    pacienteId?: number;
    pacienteNome?: string;
    pacienteAvatarUrl?: string;
    profissionais: ProfissionalSolicitadoApi[];
    modalidade: 'PRESENCIAL' | 'ONLINE';
    prazoDesejado: string;
    status: string;
  };
  profissional: {
    id: number;
    nome: string;
    avatarUrl: string | null;
    categoria: ProfessionalCategory;
    categoriaRotulo: string;
    especialidades: { id: number; nome: string; categoria: ProfessionalCategory }[];
  };
  valor: number;
  abordagem: string;
  inicio: string;
  termino: string;
  status: StatusPropostaApi;
  motivoReaceite?: 'PROPOSTA_ALTERADA' | 'SOLICITACAO_ALTERADA';
  atendimento?: AtendimentoApiResponse;
  criadoEm: string;
  atualizadoEm: string;
}

const ALTERABLE_STATUSES: ProposalStatus[] = ['pendente', 'aceita'];
const ACTIVE_REQUEST_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas', 'em_andamento'];
const CLOSED_PROPOSAL_STATUSES: ProposalStatus[] = ['recusada', 'cancelada'];
const RECEIVING_REQUEST_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas'];

/**
 * Entre as propostas do profissional numa mesma solicitação, a recusada ou
 * cancelada mais recente, que serve de base para enviar outra. Nenhuma se ele
 * já tem uma ativa (pendente ou aceita).
 */
export function resendBase(proposals: Proposal[]): Proposal | null {
  if (proposals.some((proposal) => ALTERABLE_STATUSES.includes(proposal.status))) {
    return null;
  }
  const closed = proposals.filter((proposal) => CLOSED_PROPOSAL_STATUSES.includes(proposal.status));
  return closed.reduce<Proposal | null>(
    (latest, proposal) => (!latest || proposal.createdAt > latest.createdAt ? proposal : latest),
    null,
  );
}

@Injectable({ providedIn: 'root' })
export class ProposalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/propostas`;

  /**
   * Pendente ou já aceita (deixa de estar aceita e o paciente aceita de novo),
   * com a solicitação em curso. Depois que o atendimento começou, só remarcar.
   */
  canEdit(proposal: Proposal): boolean {
    return this.canCancel(proposal) && proposal.attendance?.status !== 'em_andamento';
  }

  /** A aceita cancela o atendimento (a regra das 48h decide se conta ocorrência). */
  canCancel(proposal: Proposal): boolean {
    return ALTERABLE_STATUSES.includes(proposal.status) && ACTIVE_REQUEST_STATUSES.includes(proposal.request.status);
  }

  /**
   * Recusada ou cancelada, com a solicitação ainda recebendo propostas: o
   * profissional pode enviar outra. Só a mais recente de cada solicitação
   * oferece isso, e nenhuma se já houver uma ativa (mine = todas as dele).
   */
  canResend(proposal: Proposal, mine: Proposal[]): boolean {
    if (!RECEIVING_REQUEST_STATUSES.includes(proposal.request.status)) {
      return false;
    }
    const sameRequest = mine.filter((other) => other.requestId === proposal.requestId);
    return resendBase(sameRequest)?.id === proposal.id;
  }

  /** Paciente dono: todas as não canceladas. Profissional: só as dele. */
  listForRequest(requestId: string): Observable<Proposal[]> {
    return this.http.get<PropostaApiResponse[]>(requestProposalsUrl(requestId)).pipe(
      map((response) => response.map(toProposal)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar as propostas.'))),
    );
  }

  /** Propostas do profissional logado, das mais recentes para as mais antigas. */
  listMine(): Observable<Proposal[]> {
    return this.http.get<PropostaApiResponse[]>(this.baseUrl).pipe(
      map((response) => response.map(toProposal)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar suas propostas.'))),
    );
  }

  getById(id: string): Observable<Proposal | undefined> {
    return this.http.get<PropostaApiResponse>(`${this.baseUrl}/${id}`).pipe(
      map(toProposal),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(undefined);
        }
        return throwError(() => normalizeError(error, 'Não foi possível carregar a proposta.'));
      }),
    );
  }

  submit(requestId: string, input: ProposalInput): Observable<Proposal> {
    return this.http.post<PropostaApiResponse>(requestProposalsUrl(requestId), toApiPayload(input)).pipe(
      map(toProposal),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível enviar a proposta.'))),
    );
  }

  update(id: string, input: ProposalInput): Observable<Proposal> {
    return this.http.put<PropostaApiResponse>(`${this.baseUrl}/${id}`, toApiPayload(input)).pipe(
      map(toProposal),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível atualizar a proposta.'))),
    );
  }

  cancel(id: string): Observable<Proposal> {
    return this.http.patch<PropostaApiResponse>(`${this.baseUrl}/${id}/cancelar`, {}).pipe(
      map(toProposal),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível cancelar a proposta.'))),
    );
  }

  /** Paciente aceita: as demais pendentes são recusadas e a solicitação entra em andamento. */
  /** O paciente recusa uma proposta pendente. */
  reject(id: string): Observable<Proposal> {
    return this.http.patch<PropostaApiResponse>(`${this.baseUrl}/${id}/recusar`, {}).pipe(
      map(toProposal),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível recusar a proposta.'))),
    );
  }

  accept(id: string): Observable<Proposal> {
    return this.http.patch<PropostaApiResponse>(`${this.baseUrl}/${id}/aceitar`, {}).pipe(
      map(toProposal),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível aceitar a proposta.'))),
    );
  }
}

function requestProposalsUrl(requestId: string): string {
  return `${environment.apiUrl}/solicitacoes/${requestId}/propostas`;
}

function toProposal(response: PropostaApiResponse): Proposal {
  return {
    id: String(response.id),
    requestId: String(response.solicitacao.id),
    professionalId: String(response.profissional.id),
    professional: {
      id: String(response.profissional.id),
      name: response.profissional.nome,
      avatarUrl: response.profissional.avatarUrl ?? undefined,
      category: response.profissional.categoria,
      categoryLabel: response.profissional.categoriaRotulo,
      specialties: response.profissional.especialidades.map((especialidade) => ({
        id: String(especialidade.id),
        name: especialidade.nome,
        category: especialidade.categoria,
      })),
    },
    request: {
      id: String(response.solicitacao.id),
      patientId: response.solicitacao.pacienteId === undefined ? undefined : String(response.solicitacao.pacienteId),
      patientName: response.solicitacao.pacienteNome,
      patientAvatarUrl: response.solicitacao.pacienteAvatarUrl,
      professionals: response.solicitacao.profissionais.map(toRequestedProfessional),
      modality: response.solicitacao.modalidade === 'PRESENCIAL' ? 'presencial' : 'online',
      desiredDeadline: response.solicitacao.prazoDesejado,
      status: response.solicitacao.status.toLowerCase() as RequestStatus,
    },
    price: Number(response.valor),
    approach: response.abordagem,
    start: response.inicio,
    end: response.termino,
    status: response.status.toLowerCase() as ProposalStatus,
    reacceptReason: response.motivoReaceite?.toLowerCase() as ReacceptReason | undefined,
    attendance: response.atendimento ? toAttendance(response.atendimento) : undefined,
    createdAt: response.criadoEm,
    updatedAt: response.atualizadoEm,
  };
}

function toApiPayload(input: ProposalInput) {
  return {
    valor: input.price,
    abordagem: input.approach,
    inicio: input.start,
    termino: input.end,
  };
}

/** O que acontece ao cancelar uma proposta já aceita (a pendente cancela sem perguntar). */
export const CANCEL_ACCEPTED_PROPOSAL_CONSEQUENCES = [
  'O atendimento é cancelado e a vaga reabre para outros profissionais.',
  'O paciente é avisado.',
  'A proposta vai para o histórico.',
];

/** O que acontece ao editar uma proposta já aceita (alerta antes de abrir a edição). */
export const EDIT_ACCEPTED_PROPOSAL_CONSEQUENCES = [
  'Ela deixa de estar aceita: o atendimento marcado é cancelado e a vaga reabre.',
  'O paciente precisa aceitar ou recusar a proposta de novo (ou escolher outra).',
  'Até o novo aceite, o nome e os dados do paciente deixam de aparecer para você.',
];
