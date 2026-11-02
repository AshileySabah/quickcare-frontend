import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { normalizeError } from '../../http/api-error';
import {
  AttendanceStatus,
  DisputeDecisionInput,
  DisputeDetail,
  DisputeSummary,
  ProblemReason,
  ProblemStatus,
} from '../../models';
import { LadoApi, ProblemaApiResponse, toProblem, toSide } from '../attendance.service';
import { AcaoAdminApi, ParteApi, toAdminAction, toParty } from './admin-api';

interface DisputaResumoApi {
  id: number;
  status: string;
  atendimentoId: number;
  solicitacaoId: number;
  servico: string;
  inicio: string;
  termino: string;
  paciente: ParteApi;
  profissional: ParteApi;
  relatadoPor: LadoApi;
  motivo: string;
  criadoEm: string;
  prazoResposta: string;
  contestadoEm?: string;
}

interface DisputaDetalheApi {
  resumo: DisputaResumoApi;
  statusAtendimento: string;
  statusAntesDoRelato: string;
  problema: ProblemaApiResponse;
  eventos: { tipo: string; autor?: string; inicio: string; termino: string; detalhe?: string; criadoEm: string }[];
  acoes: AcaoAdminApi[];
}

/** Relatos de "não foi realizado" e disputas, para o admin decidir. */
@Injectable({ providedIn: 'root' })
export class AdminDisputeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/disputas`;

  /** Sem status, todos. */
  list(status: ProblemStatus[] = []): Observable<DisputeSummary[]> {
    return this.http
      .get<DisputaResumoApi[]>(this.baseUrl, { params: { status: status.map((item) => item.toUpperCase()) } })
      .pipe(
        map((response) => response.map(toSummary)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar as disputas.'))),
      );
  }

  /** Quantas aguardam decisão, para o contador no menu. */
  countOpen(): Observable<number> {
    return this.http.get<{ total: number }>(`${this.baseUrl}/em-aberto`).pipe(
      map((response) => response.total),
      catchError(() => of(0)),
    );
  }

  getById(id: string): Observable<DisputeDetail | undefined> {
    return this.http.get<DisputaDetalheApi>(`${this.baseUrl}/${id}`).pipe(
      map(toDetail),
      catchError((error: { status?: number }) =>
        error.status === 404 ? of(undefined) : throwError(() => normalizeError(error, 'Não foi possível carregar a disputa.')),
      ),
    );
  }

  decide(id: string, input: DisputeDecisionInput): Observable<DisputeDetail> {
    return this.http
      .post<DisputaDetalheApi>(`${this.baseUrl}/${id}/decisao`, {
        decisao: input.decision.toUpperCase(),
        ocorrenciaPara: input.occurrenceFor.map((side) => side.toUpperCase()),
        justificativa: input.justification.trim(),
      })
      .pipe(
        map(toDetail),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível registrar a decisão.'))),
      );
  }
}

function toSummary(response: DisputaResumoApi): DisputeSummary {
  return {
    id: String(response.id),
    status: response.status.toLowerCase() as ProblemStatus,
    attendanceId: String(response.atendimentoId),
    requestId: String(response.solicitacaoId),
    service: response.servico,
    start: response.inicio,
    end: response.termino,
    patient: toParty(response.paciente),
    professional: toParty(response.profissional),
    reportedBy: toSide(response.relatadoPor),
    reason: response.motivo.toLowerCase() as ProblemReason,
    createdAt: response.criadoEm,
    answerDeadline: response.prazoResposta,
    contestedAt: response.contestadoEm,
  };
}

function toDetail(response: DisputaDetalheApi): DisputeDetail {
  return {
    summary: toSummary(response.resumo),
    attendanceStatus: response.statusAtendimento.toLowerCase() as AttendanceStatus,
    statusBeforeReport: response.statusAntesDoRelato.toLowerCase() as AttendanceStatus,
    problem: toProblem(response.problema),
    events: response.eventos.map((evento) => ({
      type: evento.tipo,
      author: evento.autor,
      start: evento.inicio,
      end: evento.termino,
      detail: evento.detalhe,
      createdAt: evento.criadoEm,
    })),
    actions: response.acoes.map(toAdminAction),
  };
}
