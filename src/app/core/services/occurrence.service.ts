import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { AppealStatus, Block, Occurrence, OccurrenceAppeal, OccurrenceReason, OccurrenceSummary, SwitchableRole } from '../models';

export interface OcorrenciaApiResponse {
  id: number;
  motivo: string;
  criadoEm: string;
  solicitacaoId?: number;
  atendimentoId?: number;
  anulada: boolean;
  anuladaEm?: string;
  justificativa?: string;
  criadoPor?: string;
  justificativaAnulacao?: string;
  anuladaPor?: string;
  podeRecorrer: boolean;
  recurso?: RecursoApiResponse;
  jaGerouBloqueio: boolean;
}

interface RecursoApiResponse {
  id: number;
  status: string;
  texto: string;
  criadoEm: string;
  decididoEm?: string;
  justificativaDecisao?: string;
  decididoPor?: string;
}

export interface BloqueioApiResponse {
  id: number;
  nivel: number;
  inicio: string;
  fim: string;
  ativo: boolean;
  removidoEm?: string;
  removidoPor?: string;
  justificativaRemocao?: string;
  desfeito: boolean;
  aplicadoPor?: string;
  justificativa?: string;
}

interface ResumoApiResponse {
  contando: number;
  limite: number;
  janelaDias: number;
  bloqueio?: BloqueioApiResponse;
  ocorrencias: OcorrenciaApiResponse[];
}

export const PERFIL_API: Record<SwitchableRole, 'PACIENTE' | 'PROFISSIONAL'> = {
  patient: 'PACIENTE',
  professional: 'PROFISSIONAL',
};

/**
 * As ocorrências do próprio perfil, o bloqueio atual e o recurso ao admin. O
 * bloqueio fica guardado por perfil para as telas de criar solicitação e
 * enviar proposta desabilitarem o botão ({@link blockFor}).
 */
@Injectable({ providedIn: 'root' })
export class OccurrenceService {
  private readonly http = inject(HttpClient);

  /** `undefined`: ainda não consultado; `null`: sem bloqueio. */
  private readonly blocks = signal<Partial<Record<SwitchableRole, Block | null>>>({});

  summary(role: SwitchableRole): Observable<OccurrenceSummary> {
    return this.http
      .get<ResumoApiResponse>(`${environment.apiUrl}/ocorrencias`, { params: { perfil: PERFIL_API[role] } })
      .pipe(
        map(toSummary),
        tap((summary) => this.rememberBlock(role, summary)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar as ocorrências.'))),
      );
  }

  /** Recorre de uma ocorrência (uma vez só); devolve o resumo atualizado. */
  appeal(role: SwitchableRole, occurrenceId: string, text: string): Observable<OccurrenceSummary> {
    return this.http
      .post<ResumoApiResponse>(
        `${environment.apiUrl}/ocorrencias/${occurrenceId}/recurso`,
        { texto: text },
        { params: { perfil: PERFIL_API[role] } },
      )
      .pipe(
        map(toSummary),
        tap((summary) => this.rememberBlock(role, summary)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível enviar o recurso.'))),
      );
  }

  /**
   * O bloqueio atual do perfil. Consulta de novo a cada tela que pede (ele
   * pode ter sido desfeito ou ter acabado); até a resposta, vale o último
   * conhecido. Na dúvida (erro), não bloqueia: o back recusa de qualquer forma.
   */
  blockFor(role: SwitchableRole): Signal<Block | null> {
    this.summary(role)
      .pipe(catchError(() => of(null)))
      .subscribe();
    return computed(() => this.blocks()[role] ?? null);
  }

  private rememberBlock(role: SwitchableRole, summary: OccurrenceSummary): void {
    this.blocks.update((blocks) => ({ ...blocks, [role]: summary.block ?? null }));
  }
}

function toSummary(response: ResumoApiResponse): OccurrenceSummary {
  return {
    counting: response.contando,
    limit: response.limite,
    windowDays: response.janelaDias,
    block: response.bloqueio ? toBlock(response.bloqueio) : undefined,
    occurrences: response.ocorrencias.map(toOccurrence),
  };
}

export function toOccurrence(response: OcorrenciaApiResponse): Occurrence {
  return {
    id: String(response.id),
    reason: response.motivo.toLowerCase() as OccurrenceReason,
    createdAt: response.criadoEm,
    requestId: response.solicitacaoId ? String(response.solicitacaoId) : undefined,
    attendanceId: response.atendimentoId ? String(response.atendimentoId) : undefined,
    annulled: response.anulada,
    annulledAt: response.anuladaEm,
    justification: response.justificativa,
    annulmentJustification: response.justificativaAnulacao,
    createdBy: response.criadoPor,
    annulledBy: response.anuladaPor,
    canAppeal: response.podeRecorrer,
    appeal: response.recurso ? toAppeal(response.recurso) : undefined,
    alreadyBlocked: response.jaGerouBloqueio,
  };
}

function toAppeal(response: RecursoApiResponse): OccurrenceAppeal {
  return {
    id: String(response.id),
    status: response.status.toLowerCase() as AppealStatus,
    text: response.texto,
    createdAt: response.criadoEm,
    decidedAt: response.decididoEm,
    decisionJustification: response.justificativaDecisao,
    decidedBy: response.decididoPor,
  };
}

export function toBlock(response: BloqueioApiResponse): Block {
  return {
    id: String(response.id),
    level: response.nivel,
    start: response.inicio,
    end: response.fim,
    active: response.ativo,
    removedAt: response.removidoEm,
    removedBy: response.removidoPor,
    removalJustification: response.justificativaRemocao,
    undone: response.desfeito,
    appliedBy: response.aplicadoPor,
    justification: response.justificativa,
  };
}
