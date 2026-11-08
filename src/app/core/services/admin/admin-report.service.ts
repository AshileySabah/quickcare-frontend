import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { normalizeError } from '../../http/api-error';
import {
  AppealStatus,
  AttendanceStatus,
  ReportConsequence,
  ReportDecisionInput,
  ReportDetail,
  ReportReason,
  ReportStatus,
  ReportSummary,
} from '../../models';
import { LadoApi, toSide } from '../attendance.service';
import { BanimentoApi, toBan } from '../ban.service';
import { AcaoAdminApi, ParteApi, toAdminAction, toParty } from './admin-api';

interface DenunciaResumoApi {
  id: number;
  status: string;
  motivo: string;
  motivoRotulo: string;
  denunciante: LadoApi;
  paciente: ParteApi;
  profissional: ParteApi;
  pacienteId: number;
  profissionalId: number;
  criadoEm: string;
}

interface DenunciaDetalheApi {
  resumo: DenunciaResumoApi;
  descricao: string;
  anexo?: { nomeArquivo: string; contentType: string; url: string };
  consequencia?: string;
  justificativaDecisao?: string;
  analiseIniciadaEm?: string;
  analisadaPor?: string;
  decididaEm?: string;
  decididaPor?: string;
  ocorrencia?: {
    id: number;
    anulada: boolean;
    recurso?: {
      id: number;
      status: string;
      texto: string;
      criadoEm: string;
      justificativaDecisao?: string;
      decididoEm?: string;
    };
  };
  banimento?: BanimentoApi;
  atendimentos: { id: number; solicitacaoId: number; servico: string; status: string; inicio: string; termino: string }[];
  outrasDenunciasContraODenunciado: number;
  acoes: AcaoAdminApi[];
}

@Injectable({ providedIn: 'root' })
export class AdminReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/denuncias`;

  list(status: ReportStatus[] = []): Observable<ReportSummary[]> {
    return this.http
      .get<DenunciaResumoApi[]>(this.baseUrl, { params: { status: status.map((item) => item.toUpperCase()) } })
      .pipe(
        map((response) => response.map(toSummary)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar as denúncias.'))),
      );
  }

  countOpen(): Observable<number> {
    return this.http.get<{ total: number }>(`${this.baseUrl}/em-aberto`).pipe(
      map((response) => response.total),
      catchError(() => of(0)),
    );
  }

  getById(id: string): Observable<ReportDetail | undefined> {
    return this.http.get<DenunciaDetalheApi>(`${this.baseUrl}/${id}`).pipe(
      map(toDetail),
      catchError((error: { status?: number }) =>
        error.status === 404 ? of(undefined) : throwError(() => normalizeError(error, 'Não foi possível carregar a denúncia.')),
      ),
    );
  }

  decide(id: string, input: ReportDecisionInput): Observable<ReportDetail> {
    return this.http
      .post<DenunciaDetalheApi>(`${this.baseUrl}/${id}/decisao`, {
        resultado: input.result.toUpperCase(),
        consequencia: input.result === 'procedente' && input.consequence ? input.consequence.toUpperCase() : null,
        justificativa: input.justification.trim(),
        tipoBanimento: banOf(input)?.type.toUpperCase() ?? null,
        diasSuspensao: banOf(input)?.type === 'suspensao' ? banOf(input)?.days : null,
      })
      .pipe(
        map(toDetail),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível registrar a decisão.'))),
      );
  }
}

function banOf(input: ReportDecisionInput): ReportDecisionInput['ban'] {
  return input.result === 'procedente' && input.consequence === 'banimento' ? input.ban : undefined;
}

function toSummary(response: DenunciaResumoApi): ReportSummary {
  return {
    id: String(response.id),
    status: response.status.toLowerCase() as ReportStatus,
    reason: response.motivo.toLowerCase() as ReportReason,
    reasonLabel: response.motivoRotulo,
    reporter: toSide(response.denunciante),
    patient: toParty(response.paciente),
    professional: toParty(response.profissional),
    patientId: String(response.pacienteId),
    professionalId: String(response.profissionalId),
    createdAt: response.criadoEm,
  };
}

function toDetail(response: DenunciaDetalheApi): ReportDetail {
  return {
    summary: toSummary(response.resumo),
    description: response.descricao,
    attachment: response.anexo && {
      fileName: response.anexo.nomeArquivo,
      contentType: response.anexo.contentType,
      url: response.anexo.url,
    },
    consequence: response.consequencia?.toLowerCase() as ReportConsequence | undefined,
    decisionJustification: response.justificativaDecisao,
    analysisStartedAt: response.analiseIniciadaEm,
    analyzedBy: response.analisadaPor,
    decidedAt: response.decididaEm,
    decidedBy: response.decididaPor,
    occurrence: response.ocorrencia && {
      id: String(response.ocorrencia.id),
      annulled: response.ocorrencia.anulada,
      appeal: response.ocorrencia.recurso && {
        id: String(response.ocorrencia.recurso.id),
        status: response.ocorrencia.recurso.status.toLowerCase() as AppealStatus,
        text: response.ocorrencia.recurso.texto,
        createdAt: response.ocorrencia.recurso.criadoEm,
        decisionJustification: response.ocorrencia.recurso.justificativaDecisao,
        decidedAt: response.ocorrencia.recurso.decididoEm,
      },
    },
    ban: response.banimento ? toBan(response.banimento) : undefined,
    attendances: response.atendimentos.map((item) => ({
      id: String(item.id),
      requestId: String(item.solicitacaoId),
      service: item.servico,
      status: item.status.toLowerCase() as AttendanceStatus,
      start: item.inicio,
      end: item.termino,
    })),
    otherReportsAgainstReported: response.outrasDenunciasContraODenunciado,
    actions: response.acoes.map(toAdminAction),
  };
}
