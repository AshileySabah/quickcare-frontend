import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { normalizeError } from '../../http/api-error';
import { AdminRequestAction, AdminRequestDetail, AdminRequestSummary, ProposalStatus, RequestStatus } from '../../models';
import { AtendimentoApiResponse, toAttendance } from '../attendance.service';
import { SolicitacaoApiResponse, toServiceRequest } from '../request.service';
import { AcaoAdminApi, ParteApi, toAdminAction, toParty } from './admin-api';

interface SolicitacaoResumoApi {
  id: number;
  status: string;
  paciente: ParteApi;
  servico: string;
  modalidade: 'PRESENCIAL' | 'ONLINE';
  cidade?: string;
  uf?: string;
  prazoDesejado: string;
  vagas: number;
  vagasPreenchidas: number;
  criadoEm: string;
}

interface SolicitacaoDetalheApi {
  resumo: SolicitacaoResumoApi;
  solicitacao: SolicitacaoApiResponse;
  propostas: {
    id: number;
    profissional: ParteApi;
    status: string;
    valor: number;
    inicio: string;
    termino: string;
    atendimento?: AtendimentoApiResponse;
  }[];
  acoesPermitidas: string[];
  acoes: AcaoAdminApi[];
}

export interface AdminRequestFilters {
  status?: RequestStatus;
  search?: string;
}

/** Solicitações no admin: busca, detalhe e troca de status (reabrir, concluir ou cancelar) com justificativa. */
@Injectable({ providedIn: 'root' })
export class AdminRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/solicitacoes`;

  list(filters: AdminRequestFilters = {}): Observable<AdminRequestSummary[]> {
    let params = new HttpParams();
    if (filters.status) {
      params = params.set('status', filters.status.toUpperCase());
    }
    if (filters.search?.trim()) {
      params = params.set('busca', filters.search.trim());
    }
    return this.http.get<SolicitacaoResumoApi[]>(this.baseUrl, { params }).pipe(
      map((response) => response.map(toSummary)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar as solicitações.'))),
    );
  }

  getById(id: string): Observable<AdminRequestDetail | undefined> {
    return this.http.get<SolicitacaoDetalheApi>(`${this.baseUrl}/${id}`).pipe(
      map(toDetail),
      catchError((error: { status?: number }) =>
        error.status === 404
          ? of(undefined)
          : throwError(() => normalizeError(error, 'Não foi possível carregar a solicitação.')),
      ),
    );
  }

  changeStatus(id: string, action: AdminRequestAction, justification: string): Observable<AdminRequestDetail> {
    return this.http
      .patch<SolicitacaoDetalheApi>(`${this.baseUrl}/${id}/status`, {
        acao: action.toUpperCase(),
        justificativa: justification.trim(),
      })
      .pipe(
        map(toDetail),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível alterar o status.'))),
      );
  }
}

function toSummary(response: SolicitacaoResumoApi): AdminRequestSummary {
  return {
    id: String(response.id),
    status: response.status.toLowerCase() as RequestStatus,
    patient: toParty(response.paciente),
    service: response.servico,
    modality: response.modalidade === 'PRESENCIAL' ? 'presencial' : 'online',
    city: response.cidade,
    state: response.uf,
    desiredDate: response.prazoDesejado,
    slots: response.vagas,
    filledSlots: response.vagasPreenchidas,
    createdAt: response.criadoEm,
  };
}

function toDetail(response: SolicitacaoDetalheApi): AdminRequestDetail {
  return {
    summary: toSummary(response.resumo),
    request: toServiceRequest(response.solicitacao),
    proposals: response.propostas.map((proposta) => ({
      id: String(proposta.id),
      professional: toParty(proposta.profissional),
      status: proposta.status.toLowerCase() as ProposalStatus,
      price: proposta.valor,
      start: proposta.inicio,
      end: proposta.termino,
      attendance: proposta.atendimento ? toAttendance(proposta.atendimento) : undefined,
    })),
    allowedActions: response.acoesPermitidas.map((acao) => acao.toLowerCase() as AdminRequestAction),
    actions: response.acoes.map(toAdminAction),
  };
}
