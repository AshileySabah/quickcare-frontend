import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../auth/auth-api.model';
import { ProfessionalCategory, Proposal, ProposalStatus, RequestStatus } from '../models';
import { ProfissionalSolicitadoApi, toRequestedProfessional } from './request.service';

export interface ProposalInput {
  price: number;
  approach: string;
  deadline: string;
}

type StatusPropostaApi = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA';

interface PropostaApiResponse {
  id: number;
  solicitacao: {
    id: number;
    pacienteNome: string;
    profissionais: ProfissionalSolicitadoApi[];
    modalidade: 'PRESENCIAL' | 'ONLINE';
    prazoDesejado: string;
    status: string;
  };
  profissional: {
    id: number;
    nome: string;
    categoria: ProfessionalCategory;
    categoriaRotulo: string;
    especialidades: { id: number; nome: string; categoria: ProfessionalCategory }[];
  };
  valor: number;
  abordagem: string;
  prazo: string;
  status: StatusPropostaApi;
  criadoEm: string;
  atualizadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class ProposalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/propostas`;

  canEdit(proposal: Proposal): boolean {
    return proposal.status === 'pendente';
  }

  canCancel(proposal: Proposal): boolean {
    return proposal.status === 'pendente';
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
      patientName: response.solicitacao.pacienteNome,
      professionals: response.solicitacao.profissionais.map(toRequestedProfessional),
      modality: response.solicitacao.modalidade === 'PRESENCIAL' ? 'presencial' : 'online',
      desiredDeadline: response.solicitacao.prazoDesejado,
      status: response.solicitacao.status.toLowerCase() as RequestStatus,
    },
    price: Number(response.valor),
    approach: response.abordagem,
    deadline: response.prazo,
    status: response.status.toLowerCase() as ProposalStatus,
    createdAt: response.criadoEm,
    updatedAt: response.atualizadoEm,
  };
}

function toApiPayload(input: ProposalInput) {
  return {
    valor: input.price,
    abordagem: input.approach,
    prazo: input.deadline,
  };
}

function normalizeError(error: unknown, defaultMessage: string): Error {
  if (error instanceof HttpErrorResponse) {
    const apiError = error.error as ApiErrorResponse | undefined;
    return new Error(apiError?.message ?? defaultMessage);
  }

  return error instanceof Error ? error : new Error(defaultMessage);
}
