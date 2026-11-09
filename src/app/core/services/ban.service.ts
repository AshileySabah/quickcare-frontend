import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { Ban, BanAppealStatus, BanEnding, BanType, SwitchableRole } from '../models';
import { PERFIL_API } from './occurrence.service';

export interface BanimentoApi {
  id: number;
  perfil: 'PACIENTE' | 'PROFISSIONAL';
  tipo: string;
  inicio: string;
  fim?: string;
  justificativa: string;
  aplicadoPor?: string;
  denunciaId?: number;
  ativo: boolean;
  podeRecorrer: boolean;
  encerradoEm?: string;
  encerramento?: string;
  encerradoPor?: string;
  justificativaEncerramento?: string;
  recurso?: {
    status: string;
    texto: string;
    criadoEm: string;
    decididoEm?: string;
    decididoPor?: string;
    justificativa?: string;
  };
}

interface SituacaoApi {
  banimento: BanimentoApi | null;
}

@Injectable({ providedIn: 'root' })
export class BanService {
  private readonly http = inject(HttpClient);
  private readonly bans = signal<Partial<Record<SwitchableRole, Ban | null>>>({});

  current(role: SwitchableRole): Observable<Ban | null> {
    return this.http
      .get<SituacaoApi>(`${environment.apiUrl}/banimentos`, { params: { perfil: PERFIL_API[role] } })
      .pipe(
        map((response) => (response?.banimento ? toBan(response.banimento) : null)),
        tap((ban) => this.remember(role, ban)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar o banimento.'))),
      );
  }

  appeal(role: SwitchableRole, banId: string, text: string): Observable<Ban | null> {
    return this.http
      .post<SituacaoApi>(
        `${environment.apiUrl}/banimentos/${banId}/recurso`,
        { texto: text.trim() },
        { params: { perfil: PERFIL_API[role] } },
      )
      .pipe(
        map((response) => (response?.banimento ? toBan(response.banimento) : null)),
        tap((ban) => this.remember(role, ban)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível enviar o recurso.'))),
      );
  }

  banFor(role: SwitchableRole): Signal<Ban | null> {
    this.current(role)
      .pipe(catchError(() => of(null)))
      .subscribe();
    return computed(() => this.bans()[role] ?? null);
  }

  private remember(role: SwitchableRole, ban: Ban | null): void {
    this.bans.update((current) => ({ ...current, [role]: ban }));
  }
}

export function toBan(api: BanimentoApi): Ban {
  return {
    id: String(api.id),
    role: api.perfil === 'PACIENTE' ? 'patient' : 'professional',
    type: api.tipo.toLowerCase() as BanType,
    start: api.inicio,
    end: api.fim,
    justification: api.justificativa,
    appliedBy: api.aplicadoPor,
    reportId: api.denunciaId ? String(api.denunciaId) : undefined,
    active: api.ativo,
    canAppeal: api.podeRecorrer,
    endedAt: api.encerradoEm,
    ending: api.encerramento?.toLowerCase() as BanEnding | undefined,
    endedBy: api.encerradoPor,
    endingJustification: api.justificativaEncerramento,
    appeal: api.recurso && {
      status: api.recurso.status.toLowerCase() as BanAppealStatus,
      text: api.recurso.texto,
      createdAt: api.recurso.criadoEm,
      decidedAt: api.recurso.decididoEm,
      decidedBy: api.recurso.decididoPor,
      justification: api.recurso.justificativa,
    },
  };
}
