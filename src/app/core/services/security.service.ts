import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { LoginApiResponse, MensagemApiResponse } from '../auth/auth-api.model';
import { normalizeError } from '../http/api-error';
import { ClosureTarget, SecurityOverview, SecurityProfile, SwitchableRole, User } from '../models';
import { PERFIL_API } from './occurrence.service';

interface SegurancaApi {
  email: string;
  perfis: {
    perfil: 'PACIENTE' | 'PROFISSIONAL';
    encerrado: boolean;
    encerradoEm?: string;
    excluiEm?: string;
  }[];
}

export const ALVO_API: Record<ClosureTarget, 'PACIENTE' | 'PROFISSIONAL' | 'CONTA'> = {
  patient: 'PACIENTE',
  professional: 'PROFISSIONAL',
  account: 'CONTA',
};

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/seguranca`;

  overview(): Observable<SecurityOverview> {
    return this.http.get<SegurancaApi>(this.baseUrl).pipe(
      map((response): SecurityOverview => ({
        email: response.email,
        profiles: response.perfis.map((perfil): SecurityProfile => ({
          role: perfil.perfil === 'PACIENTE' ? 'patient' : 'professional',
          closed: perfil.encerrado,
          closedAt: perfil.encerradoEm,
          deletesAt: perfil.excluiEm,
        })),
      })),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar a segurança da conta.'))),
    );
  }

  requestEmailCode(newEmail: string, password: string): Observable<string> {
    return this.http
      .post<MensagemApiResponse>(`${this.baseUrl}/email/codigo`, { novoEmail: newEmail.trim(), senha: password })
      .pipe(
        map((response) => response.mensagem),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível enviar o código.'))),
      );
  }

  confirmEmail(code: string): Observable<User> {
    return this.http.patch<LoginApiResponse>(`${this.baseUrl}/email`, { codigo: code.trim() }).pipe(
      map((response) => this.authService.applySession(response)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível trocar o e-mail.'))),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<string> {
    return this.http
      .patch<MensagemApiResponse>(`${this.baseUrl}/senha`, { senhaAtual: currentPassword, novaSenha: newPassword })
      .pipe(
        map((response) => response.mensagem),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível trocar a senha.'))),
      );
  }

  requestClosureCode(target: ClosureTarget, password: string): Observable<string> {
    return this.http
      .post<MensagemApiResponse>(`${this.baseUrl}/encerramento/codigo`, { alvo: ALVO_API[target], senha: password })
      .pipe(
        map((response) => response.mensagem),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível enviar o código.'))),
      );
  }

  close(target: ClosureTarget, code: string): Observable<User | null> {
    return this.http
      .post<LoginApiResponse | null>(`${this.baseUrl}/encerramento`, { alvo: ALVO_API[target], codigo: code.trim() })
      .pipe(
        map((response) => {
          if (target === 'account' || !response) {
            this.authService.clearLocalSession();
            return null;
          }
          return this.authService.applySession(response);
        }),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível encerrar.'))),
      );
  }

  recoverProfile(role: SwitchableRole): Observable<User> {
    return this.http
      .post<LoginApiResponse>(`${this.baseUrl}/perfis/recuperar`, {}, { params: { perfil: PERFIL_API[role] } })
      .pipe(
        map((response) => this.authService.applySession(response)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível recuperar o perfil.'))),
      );
  }
}
