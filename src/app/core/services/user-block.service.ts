import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { BlockPreview, BlockTargetKind, BlockedUser, SwitchableRole } from '../models';
import { PERFIL_API } from './occurrence.service';

interface BloqueioUsuarioApi {
  id: number;
  perfilId: number;
  nome: string;
  avatarUrl: string | null;
  criadoEm: string;
}

interface PreviaBloqueioApi {
  nome: string;
  propostasPendentes: number;
  atendimentosVigentes: number;
  contaOcorrencia: boolean;
}

const PATH: Record<BlockTargetKind, string> = {
  professional: 'profissionais',
  patient: 'pacientes',
};

/**
 * Bloqueio entre paciente e profissional: vale nos dois sentidos e encerra o
 * que estava vigente entre eles. Só quem bloqueou desbloqueia.
 */
@Injectable({ providedIn: 'root' })
export class UserBlockService {
  private readonly http = inject(HttpClient);

  list(role: SwitchableRole): Observable<BlockedUser[]> {
    return this.http
      .get<BloqueioUsuarioApi[]>(`${environment.apiUrl}/bloqueios`, { params: { perfil: PERFIL_API[role] } })
      .pipe(
        map((items) => items.map(toBlockedUser)),
        catchError(fail('Não foi possível carregar os usuários bloqueados.')),
      );
  }

  preview(kind: BlockTargetKind, id: string): Observable<BlockPreview> {
    return this.http.get<PreviaBloqueioApi>(`${environment.apiUrl}/bloqueios/${PATH[kind]}/${id}/previa`).pipe(
      map((api) => ({
        name: api.nome,
        pendingProposals: api.propostasPendentes,
        activeAttendances: api.atendimentosVigentes,
        countsAsOccurrence: api.contaOcorrencia,
      })),
      catchError(fail('Não foi possível conferir o bloqueio.')),
    );
  }

  block(kind: BlockTargetKind, id: string): Observable<BlockedUser> {
    return this.http
      .post<BloqueioUsuarioApi>(`${environment.apiUrl}/bloqueios/${PATH[kind]}/${id}`, {})
      .pipe(map(toBlockedUser), catchError(fail('Não foi possível bloquear.')));
  }

  unblock(blockId: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/bloqueios/${blockId}`)
      .pipe(catchError(fail('Não foi possível desbloquear.')));
  }
}

function fail(defaultMessage: string) {
  return (error: unknown) => throwError(() => normalizeError(error, defaultMessage));
}

function toBlockedUser(api: BloqueioUsuarioApi): BlockedUser {
  return {
    id: String(api.id),
    profileId: String(api.perfilId),
    name: api.nome,
    avatarUrl: api.avatarUrl ?? undefined,
    createdAt: api.criadoEm,
  };
}
