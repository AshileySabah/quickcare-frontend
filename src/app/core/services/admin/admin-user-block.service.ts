import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { normalizeError } from '../../http/api-error';
import { AdminUserBlock, UserBlockAuthor } from '../../models';
import { ParteApi, toParty } from './admin-api';

interface BloqueioUsuarioAdminApi {
  id: number;
  paciente: ParteApi;
  profissional: ParteApi;
  bloqueadoPor: string;
  criadoPor?: string;
  justificativa?: string;
  criadoEm: string;
}

/**
 * Bloqueios entre paciente e profissional no admin (Gerais): todos, bloquear
 * dois usuários entre si e remover qualquer um, sempre com justificativa.
 */
@Injectable({ providedIn: 'root' })
export class AdminUserBlockService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/bloqueios-usuario`;

  list(search?: string): Observable<AdminUserBlock[]> {
    const params = search?.trim() ? new HttpParams().set('busca', search.trim()) : undefined;
    return this.http.get<BloqueioUsuarioAdminApi[]>(this.baseUrl, { params }).pipe(
      map((response) => response.map(toUserBlock)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar os bloqueios.'))),
    );
  }

  /** Ids de usuário do paciente e do profissional (os da busca de perfis). */
  block(patientUserId: string, professionalUserId: string, justification: string): Observable<AdminUserBlock> {
    return this.http
      .post<BloqueioUsuarioAdminApi>(this.baseUrl, {
        pacienteUsuarioId: Number(patientUserId),
        profissionalUsuarioId: Number(professionalUserId),
        justificativa: justification.trim(),
      })
      .pipe(
        map(toUserBlock),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível bloquear.'))),
      );
  }

  remove(id: string, justification: string): Observable<void> {
    return this.http
      .patch<void>(`${this.baseUrl}/${id}/remover`, { justificativa: justification.trim() })
      .pipe(catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível remover o bloqueio.'))));
  }
}

function toUserBlock(api: BloqueioUsuarioAdminApi): AdminUserBlock {
  return {
    id: String(api.id),
    patient: toParty(api.paciente),
    professional: toParty(api.profissional),
    blockedBy: api.bloqueadoPor.toLowerCase() as UserBlockAuthor,
    createdBy: api.criadoPor,
    justification: api.justificativa,
    createdAt: api.criadoEm,
  };
}
