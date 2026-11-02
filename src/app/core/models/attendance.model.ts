/**
 * O atendimento de uma proposta aceita. Muda sozinho no horário: agendado →
 * em andamento → finalizado → concluído (72h depois do término).
 */
export type AttendanceStatus =
  | 'agendado'
  | 'aguardando_reaceite'
  | 'em_andamento'
  | 'finalizado'
  | 'concluido'
  | 'cancelado';

export type AttendanceSide = 'paciente' | 'profissional' | 'sistema';

export type AttendanceCancellationReason =
  | 'desistencia'
  | 'solicitacao_cancelada'
  | 'proposta_alterada'
  | 'reaceite_recusado'
  | 'sem_reaceite'
  | 'substituido'
  | 'edicao_incompativel';

/** Período proposto por um lado, à espera da resposta do outro. */
export interface AttendanceReschedule {
  start: string;
  end: string;
  requestedBy: AttendanceSide;
  requestedAt: string;
}

export interface Attendance {
  id: string;
  status: AttendanceStatus;
  start: string;
  end: string;
  acceptedAt: string;
  reschedule?: AttendanceReschedule;
  cancelledBy?: AttendanceSide;
  cancellationReason?: AttendanceCancellationReason;
  /** Cancelar agora contaria como ocorrência (regra das 48h). */
  cancellationCountsAsOccurrence: boolean;
  /** Falta menos de 48h para o início: editar a solicitação agora pode penalizar o paciente. */
  lateChange: boolean;
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  agendado: 'Agendado',
  aguardando_reaceite: 'Aguardando reaceite',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

/** Ainda vai acontecer ou está acontecendo. */
export const ACTIVE_ATTENDANCE_STATUSES: AttendanceStatus[] = ['agendado', 'aguardando_reaceite', 'em_andamento'];

const CANCELLATION_REASONS: Record<AttendanceCancellationReason, string> = {
  desistencia: 'O atendimento foi cancelado.',
  solicitacao_cancelada: 'A solicitação foi cancelada.',
  proposta_alterada: 'A proposta foi alterada depois do aceite e aguarda um novo aceite do paciente.',
  reaceite_recusado: 'O profissional recusou a nova versão da solicitação.',
  sem_reaceite: 'O início chegou sem o profissional reaceitar a nova versão da solicitação.',
  substituido: 'O paciente escolheu outro profissional para a vaga.',
  edicao_incompativel: 'A nova versão da solicitação não tinha mais vaga para este profissional.',
};

/** Por que o atendimento foi cancelado, dito de forma neutra para os dois lados. */
export function cancellationDescription(attendance: Attendance): string {
  if (attendance.cancellationReason === 'desistencia') {
    return attendance.cancelledBy === 'paciente' ? 'O paciente cancelou o atendimento.' : 'O profissional cancelou o atendimento.';
  }
  return attendance.cancellationReason ? CANCELLATION_REASONS[attendance.cancellationReason] : 'O atendimento foi cancelado.';
}
