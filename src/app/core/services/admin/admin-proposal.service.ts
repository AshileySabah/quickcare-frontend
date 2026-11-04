import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { normalizeError } from '../../http/api-error';
import {
  AdminProposalAction,
  AdminProposalSummary,
  AttendanceStatus,
  ProposalStatus,
  RequestStatus,
} from '../../models';
import { ParteApi, toParty } from './admin-api';

interface PropostaAdminApi {
  id: number;
  status: string;
  solicitacaoId: number;
  statusSolicitacao: string;
  servico: string;
  paciente: ParteApi;
  profissional: ParteApi;
  valor: number;
  inicio: string;
  termino: string;
  statusAtendimento?: string;
  acoesPermitidas: string[];
  criadoEm: string;
}

export interface AdminProposalFilters {
  status?: ProposalStatus;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminProposalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/propostas`;

  list(filters: AdminProposalFilters = {}): Observable<AdminProposalSummary[]> {
    let params = new HttpParams();
    if (filters.status) {
      params = params.set('status', filters.status.toUpperCase());
    }
    if (filters.search?.trim()) {
      params = params.set('busca', filters.search.trim());
    }
    return this.http.get<PropostaAdminApi[]>(this.baseUrl, { params }).pipe(
      map((response) => response.map(toSummary)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar as propostas.'))),
    );
  }

  changeStatus(id: string, action: AdminProposalAction, justification: string): Observable<AdminProposalSummary> {
    return this.http
      .patch<PropostaAdminApi>(`${this.baseUrl}/${id}/status`, {
        acao: action.toUpperCase(),
        justificativa: justification.trim(),
      })
      .pipe(
        map(toSummary),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível alterar a proposta.'))),
      );
  }
}

function toSummary(api: PropostaAdminApi): AdminProposalSummary {
  return {
    id: String(api.id),
    status: api.status.toLowerCase() as ProposalStatus,
    requestId: String(api.solicitacaoId),
    requestStatus: api.statusSolicitacao.toLowerCase() as RequestStatus,
    service: api.servico,
    patient: toParty(api.paciente),
    professional: toParty(api.profissional),
    price: api.valor,
    start: api.inicio,
    end: api.termino,
    attendanceStatus: api.statusAtendimento ? (api.statusAtendimento.toLowerCase() as AttendanceStatus) : undefined,
    allowedActions: api.acoesPermitidas.map((acao) => acao.toLowerCase() as AdminProposalAction),
    createdAt: api.criadoEm,
  };
}
