import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { normalizeError } from '../../http/api-error';
import {
  AdminProfileDetail,
  AdminProfileSummary,
  BlockReasonStatus,
  LateBlockReason,
  ProfileSituation,
  SwitchableRole,
} from '../../models';
import { BloqueioApiResponse, OcorrenciaApiResponse, PERFIL_API, toBlock, toOccurrence } from '../occurrence.service';
import { StatusValidacaoApi, toValidationStatus } from '../validation.service';
import { AcaoAdminApi, toAdminAction } from './admin-api';

interface PerfilResumoApi {
  usuarioId: number;
  perfil: 'PACIENTE' | 'PROFISSIONAL';
  nome: string;
  email: string;
  statusValidacao: StatusValidacaoApi;
  banido: boolean;
  ocorrenciasContando: number;
  recursosEmAnalise: number;
  bloqueio?: BloqueioApiResponse;
}

interface PerfilDetalheApi {
  resumo: PerfilResumoApi;
  limite: number;
  janelaDias: number;
  ocorrencias: OcorrenciaApiResponse[];
  bloqueios: BloqueioApiResponse[];
  motivosDeBloqueio: MotivoBloqueioApi[];
  acoes: AcaoAdminApi[];
}

interface MotivoBloqueioApi {
  id: number;
  status: 'EM_ANALISE' | 'ACEITO' | 'NEGADO';
  texto: string;
  bloqueado: string;
  solicitacaoId: number;
  servico: string;
  inicioDoAtendimento: string;
  aceitoEm: string;
  criadoEm: string;
  decididoEm?: string;
  decididoPor?: string;
  justificativaDecisao?: string;
}

export interface ProfileFilters {
  role?: SwitchableRole;
  search?: string;
  situation: ProfileSituation;
}

@Injectable({ providedIn: 'root' })
export class AdminProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  list(filters: ProfileFilters): Observable<AdminProfileSummary[]> {
    let params = new HttpParams().set('situacao', filters.situation.toUpperCase());
    if (filters.role) {
      params = params.set('perfil', PERFIL_API[filters.role]);
    }
    if (filters.search?.trim()) {
      params = params.set('busca', filters.search.trim());
    }
    return this.http.get<PerfilResumoApi[]>(`${this.baseUrl}/perfis`, { params }).pipe(
      map((response) => response.map(toSummary)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar os perfis.'))),
    );
  }

  getById(role: SwitchableRole, userId: string): Observable<AdminProfileDetail | undefined> {
    return this.http.get<PerfilDetalheApi>(`${this.baseUrl}/perfis/${PERFIL_API[role]}/${userId}`).pipe(
      map(toDetail),
      catchError((error: { status?: number }) =>
        error.status === 404 ? of(undefined) : throwError(() => normalizeError(error, 'Não foi possível carregar o perfil.')),
      ),
    );
  }

  addOccurrence(role: SwitchableRole, userId: string, justification: string): Observable<AdminProfileDetail> {
    return this.send(
      this.http.post<PerfilDetalheApi>(`${this.baseUrl}/perfis/${PERFIL_API[role]}/${userId}/ocorrencias`, {
        justificativa: justification.trim(),
      }),
      'Não foi possível lançar a ocorrência.',
    );
  }

  annulOccurrence(occurrenceId: string, justification: string): Observable<AdminProfileDetail> {
    return this.send(
      this.http.patch<PerfilDetalheApi>(`${this.baseUrl}/ocorrencias/${occurrenceId}/anular`, {
        justificativa: justification.trim(),
      }),
      'Não foi possível anular a ocorrência.',
    );
  }

  decideAppeal(appealId: string, annul: boolean, justification: string): Observable<AdminProfileDetail> {
    return this.send(
      this.http.patch<PerfilDetalheApi>(`${this.baseUrl}/recursos/${appealId}/decisao`, {
        anular: annul,
        justificativa: justification.trim(),
      }),
      'Não foi possível decidir o recurso.',
    );
  }

  decideBlockReason(reasonId: string, accept: boolean, justification: string): Observable<AdminProfileDetail> {
    return this.send(
      this.http.patch<PerfilDetalheApi>(`${this.baseUrl}/motivos-de-bloqueio/${reasonId}/decisao`, {
        aceitar: accept,
        justificativa: justification.trim(),
      }),
      'Não foi possível decidir o motivo do bloqueio.',
    );
  }

  countOpenAppeals(): Observable<number> {
    return this.http.get<{ total: number }>(`${this.baseUrl}/recursos/em-aberto`).pipe(
      map((response) => response.total),
      catchError(() => of(0)),
    );
  }

  applyBlock(role: SwitchableRole, userId: string, justification: string): Observable<AdminProfileDetail> {
    return this.send(
      this.http.post<PerfilDetalheApi>(`${this.baseUrl}/perfis/${PERFIL_API[role]}/${userId}/bloqueios`, {
        justificativa: justification.trim(),
      }),
      'Não foi possível aplicar o bloqueio.',
    );
  }

  removeBlock(blockId: string, justification: string): Observable<AdminProfileDetail> {
    return this.send(
      this.http.patch<PerfilDetalheApi>(`${this.baseUrl}/bloqueios/${blockId}/remover`, {
        justificativa: justification.trim(),
      }),
      'Não foi possível remover o bloqueio.',
    );
  }

  private send(request$: Observable<PerfilDetalheApi>, fallback: string): Observable<AdminProfileDetail> {
    return request$.pipe(
      map(toDetail),
      catchError((error: unknown) => throwError(() => normalizeError(error, fallback))),
    );
  }
}

function toSummary(response: PerfilResumoApi): AdminProfileSummary {
  return {
    userId: String(response.usuarioId),
    role: response.perfil === 'PACIENTE' ? 'patient' : 'professional',
    name: response.nome,
    email: response.email,
    validationStatus: toValidationStatus(response.statusValidacao),
    banned: response.banido,
    counting: response.ocorrenciasContando,
    openAppeals: response.recursosEmAnalise,
    block: response.bloqueio ? toBlock(response.bloqueio) : undefined,
  };
}

function toDetail(response: PerfilDetalheApi): AdminProfileDetail {
  return {
    summary: toSummary(response.resumo),
    limit: response.limite,
    windowDays: response.janelaDias,
    occurrences: response.ocorrencias.map(toOccurrence),
    blocks: response.bloqueios.map(toBlock),
    blockReasons: (response.motivosDeBloqueio ?? []).map(toBlockReason),
    actions: response.acoes.map(toAdminAction),
  };
}

function toBlockReason(api: MotivoBloqueioApi): LateBlockReason {
  return {
    id: String(api.id),
    status: api.status.toLowerCase() as BlockReasonStatus,
    text: api.texto,
    blockedName: api.bloqueado,
    requestId: String(api.solicitacaoId),
    service: api.servico,
    attendanceStart: api.inicioDoAtendimento,
    acceptedAt: api.aceitoEm,
    createdAt: api.criadoEm,
    decidedAt: api.decididoEm,
    decidedBy: api.decididoPor,
    decisionJustification: api.justificativaDecisao,
  };
}
