import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { Attendance, AttendanceCancellationReason, AttendanceSide, AttendanceStatus } from '../models';

type LadoApi = 'PACIENTE' | 'PROFISSIONAL' | 'SISTEMA';

export interface AtendimentoApiResponse {
  id: number;
  status: string;
  inicio: string;
  termino: string;
  aceitoEm: string;
  remarcacao?: { inicio: string; termino: string; solicitadaPor: LadoApi; solicitadaEm: string };
  canceladoPor?: LadoApi;
  motivoCancelamento?: string;
  cancelamentoContaOcorrencia: boolean;
  alteracaoTardia: boolean;
}

export interface RescheduleInput {
  /** ISO (com fuso). */
  start: string;
  end: string;
}

/** O que cada lado pode fazer com o atendimento, conforme o status. */
export type AttendanceViewer = 'patient' | 'professional';

/**
 * Ações sobre o atendimento de uma proposta aceita. O atendimento em si vem
 * dentro da proposta; depois de cada ação a tela recarrega a proposta.
 */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/atendimentos`;

  /** Remarcar e cancelar valem a qualquer momento até o término. */
  canChange(attendance: Attendance): boolean {
    return attendance.status === 'agendado' || attendance.status === 'em_andamento';
  }

  /** A remarcação pendente foi pedida pelo outro lado: quem vê responde. */
  canAnswerReschedule(attendance: Attendance, viewer: AttendanceViewer): boolean {
    return !!attendance.reschedule && attendance.reschedule.requestedBy !== sideOf(viewer);
  }

  canReaccept(attendance: Attendance, viewer: AttendanceViewer): boolean {
    return viewer === 'professional' && attendance.status === 'aguardando_reaceite';
  }

  reaccept(id: string): Observable<Attendance> {
    return this.patch(`${id}/reaceitar`, 'Não foi possível reaceitar.');
  }

  declineReaccept(id: string): Observable<Attendance> {
    return this.patch(`${id}/recusar-reaceite`, 'Não foi possível recusar a nova versão.');
  }

  requestReschedule(id: string, input: RescheduleInput): Observable<Attendance> {
    return this.http
      .post<AtendimentoApiResponse>(`${this.baseUrl}/${id}/remarcacao`, { inicio: input.start, termino: input.end })
      .pipe(
        map(toAttendance),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível pedir a remarcação.'))),
      );
  }

  acceptReschedule(id: string): Observable<Attendance> {
    return this.patch(`${id}/remarcacao/aceitar`, 'Não foi possível aceitar a remarcação.');
  }

  declineReschedule(id: string): Observable<Attendance> {
    return this.patch(`${id}/remarcacao/recusar`, 'Não foi possível recusar a remarcação.');
  }

  cancel(id: string): Observable<Attendance> {
    return this.patch(`${id}/cancelar`, 'Não foi possível cancelar o atendimento.');
  }

  private patch(path: string, fallback: string): Observable<Attendance> {
    return this.http.patch<AtendimentoApiResponse>(`${this.baseUrl}/${path}`, {}).pipe(
      map(toAttendance),
      catchError((error: unknown) => throwError(() => normalizeError(error, fallback))),
    );
  }
}

function sideOf(viewer: AttendanceViewer): AttendanceSide {
  return viewer === 'patient' ? 'paciente' : 'profissional';
}

function toSide(lado: LadoApi): AttendanceSide {
  return lado.toLowerCase() as AttendanceSide;
}

export function toAttendance(response: AtendimentoApiResponse): Attendance {
  return {
    id: String(response.id),
    status: response.status.toLowerCase() as AttendanceStatus,
    start: response.inicio,
    end: response.termino,
    acceptedAt: response.aceitoEm,
    reschedule: response.remarcacao
      ? {
          start: response.remarcacao.inicio,
          end: response.remarcacao.termino,
          requestedBy: toSide(response.remarcacao.solicitadaPor),
          requestedAt: response.remarcacao.solicitadaEm,
        }
      : undefined,
    cancelledBy: response.canceladoPor ? toSide(response.canceladoPor) : undefined,
    cancellationReason: response.motivoCancelamento?.toLowerCase() as AttendanceCancellationReason | undefined,
    cancellationCountsAsOccurrence: response.cancelamentoContaOcorrencia,
    lateChange: response.alteracaoTardia,
  };
}
