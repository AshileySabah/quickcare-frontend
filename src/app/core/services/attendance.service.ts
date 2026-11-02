import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import {
  Attendance,
  AttendanceCancellationReason,
  AttendanceProblem,
  AttendanceSide,
  AttendanceStatus,
  ProblemDecision,
  ProblemReason,
  ProblemStatus,
} from '../models';

export type LadoApi = 'PACIENTE' | 'PROFISSIONAL' | 'SISTEMA';

export interface ProblemaApiResponse {
  id: number;
  status: string;
  relatadoPor: LadoApi;
  motivo: string;
  descricao: string;
  criadoEm: string;
  prazoResposta: string;
  contestacao?: string;
  contestadoEm?: string;
  decisao?: string;
  decisaoJustificativa?: string;
  decididoEm?: string;
  anexos: { id: number; lado: LadoApi; nomeArquivo: string; contentType: string; url?: string }[];
}

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
  podeRelatarProblema: boolean;
  problema?: ProblemaApiResponse;
}

/** "Não foi realizado": por quê, o que aconteceu e até 3 provas. */
export interface ProblemReportInput {
  reason: ProblemReason;
  description: string;
  files: File[];
}

export interface ProblemContestInput {
  description: string;
  files: File[];
}

/** Quantos anexos cada lado pode mandar no relato ou na contestação (o back confere). */
export const MAX_PROBLEM_ATTACHMENTS = 3;

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

  /** Quem relatou aguarda; o outro lado confirma ou contesta (inclusive depois do prazo, se ficou sem resposta). */
  canAnswerProblem(attendance: Attendance, viewer: AttendanceViewer): boolean {
    const problem = attendance.problem;
    return !!problem && problem.reportedBy !== sideOf(viewer) && problem.status === 'aguardando_resposta';
  }

  canContestProblem(attendance: Attendance, viewer: AttendanceViewer): boolean {
    const problem = attendance.problem;
    return (
      !!problem &&
      problem.reportedBy !== sideOf(viewer) &&
      (problem.status === 'aguardando_resposta' || problem.status === 'sem_resposta')
    );
  }

  reportProblem(id: string, input: ProblemReportInput): Observable<Attendance> {
    const dados = { motivo: input.reason.toUpperCase(), descricao: input.description.trim() };
    return this.multipart(`${id}/problema`, dados, input.files, 'Não foi possível enviar o relato.');
  }

  confirmProblem(id: string): Observable<Attendance> {
    return this.patch(`${id}/problema/confirmar`, 'Não foi possível confirmar.');
  }

  contestProblem(id: string, input: ProblemContestInput): Observable<Attendance> {
    return this.multipart(`${id}/problema/contestacao`, { descricao: input.description.trim() }, input.files,
      'Não foi possível enviar a contestação.');
  }

  /** URL temporária para abrir um anexo do relato ou da contestação. */
  attachmentUrl(attendanceId: string, attachmentId: string): Observable<string> {
    return this.http.get<{ url: string }>(`${this.baseUrl}/${attendanceId}/problema/anexos/${attachmentId}`).pipe(
      map((response) => response.url),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível abrir o anexo.'))),
    );
  }

  private multipart(path: string, dados: object, files: File[], fallback: string): Observable<Attendance> {
    const formData = new FormData();
    formData.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }));
    files.forEach((file) => formData.append('anexos', file, file.name));
    return this.http.post<AtendimentoApiResponse>(`${this.baseUrl}/${path}`, formData).pipe(
      map(toAttendance),
      catchError((error: unknown) => throwError(() => normalizeError(error, fallback))),
    );
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

export function toSide(lado: LadoApi): AttendanceSide {
  return lado.toLowerCase() as AttendanceSide;
}

export function toProblem(response: ProblemaApiResponse): AttendanceProblem {
  return {
    id: String(response.id),
    status: response.status.toLowerCase() as ProblemStatus,
    reportedBy: toSide(response.relatadoPor),
    reason: response.motivo.toLowerCase() as ProblemReason,
    description: response.descricao,
    createdAt: response.criadoEm,
    answerDeadline: response.prazoResposta,
    contestation: response.contestacao,
    contestedAt: response.contestadoEm,
    decision: response.decisao?.toLowerCase() as ProblemDecision | undefined,
    decisionJustification: response.decisaoJustificativa,
    decidedAt: response.decididoEm,
    attachments: response.anexos.map((anexo) => ({
      id: String(anexo.id),
      side: toSide(anexo.lado),
      fileName: anexo.nomeArquivo,
      contentType: anexo.contentType,
      url: anexo.url,
    })),
  };
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
    canReportProblem: response.podeRelatarProblema,
    problem: response.problema ? toProblem(response.problema) : undefined,
  };
}
