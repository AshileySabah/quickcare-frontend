import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { PendingRatings, RatingHighlight, RatingInput, RatingSummary, SwitchableRole } from '../models';
import { PERFIL_API } from './occurrence.service';

interface DestaqueApi {
  codigo: string;
  rotulo: string;
  positivo: boolean;
}

interface PendenteApi {
  atendimentoId: number;
  solicitacaoId: number;
  servico: string;
  nomeAvaliado: string | null;
  inicio: string;
  termino: string;
  prazo: string;
}

interface PendentesApi {
  pendentes: PendenteApi[];
  destaques: DestaqueApi[];
}

export interface ResumoAvaliacoesApi {
  media: number | null;
  total: number;
  destaques: (DestaqueApi & { total: number })[];
}

@Injectable({ providedIn: 'root' })
export class RatingService {
  private readonly http = inject(HttpClient);
  private readonly promptDismissed = new Set<SwitchableRole>();

  shouldPrompt(role: SwitchableRole): boolean {
    return !this.promptDismissed.has(role);
  }

  dismissPrompt(role: SwitchableRole): void {
    this.promptDismissed.add(role);
  }

  pending(role: SwitchableRole): Observable<PendingRatings> {
    return this.http
      .get<PendentesApi>(`${environment.apiUrl}/avaliacoes/pendentes`, { params: { perfil: PERFIL_API[role] } })
      .pipe(
        map(toPendingRatings),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar as avaliações.'))),
      );
  }

  rate(attendanceId: string, rating: RatingInput): Observable<PendingRatings> {
    return this.http
      .post<PendentesApi>(`${environment.apiUrl}/avaliacoes/atendimentos/${attendanceId}`, {
        nota: rating.score,
        destaques: rating.highlights,
      })
      .pipe(
        map(toPendingRatings),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível enviar a avaliação.'))),
      );
  }
}

function toPendingRatings(api: PendentesApi): PendingRatings {
  return {
    pending: api.pendentes.map((item) => ({
      attendanceId: String(item.atendimentoId),
      requestId: String(item.solicitacaoId),
      service: item.servico,
      ratedName: item.nomeAvaliado ?? undefined,
      start: item.inicio,
      end: item.termino,
      deadline: item.prazo,
    })),
    highlights: api.destaques.map(toHighlight),
  };
}

function toHighlight(api: DestaqueApi): RatingHighlight {
  return { code: api.codigo, label: api.rotulo, positive: api.positivo };
}

export function toRatingSummary(api: ResumoAvaliacoesApi | null | undefined): RatingSummary {
  return {
    average: api?.media ?? null,
    total: api?.total ?? 0,
    highlights: (api?.destaques ?? []).map((item) => ({ ...toHighlight(item), total: item.total })),
  };
}
