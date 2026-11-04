export type AttendanceStatus =
  | 'agendado'
  | 'aguardando_reaceite'
  | 'em_andamento'
  | 'finalizado'
  | 'concluido'
  | 'cancelado'
  | 'problema_relatado'
  | 'em_disputa'
  | 'nao_realizado';

export type AttendanceSide = 'paciente' | 'profissional' | 'sistema';

export type AttendanceCancellationReason =
  | 'desistencia'
  | 'solicitacao_cancelada'
  | 'proposta_alterada'
  | 'reaceite_recusado'
  | 'sem_reaceite'
  | 'substituido'
  | 'edicao_incompativel'
  | 'admin';

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
  cancellationCountsAsOccurrence: boolean;
  lateChange: boolean;
  canReportProblem: boolean;
  problem?: AttendanceProblem;
}

export type ProblemReason = 'outro_nao_compareceu' | 'combinado';

export type ProblemStatus = 'aguardando_resposta' | 'confirmado' | 'sem_resposta' | 'em_disputa' | 'decidido';

export type ProblemDecision = 'realizado' | 'nao_realizado';

export interface ProblemAttachment {
  id: string;
  side: AttendanceSide;
  fileName: string;
  contentType: string;
  url?: string;
}

export interface AttendanceProblem {
  id: string;
  status: ProblemStatus;
  reportedBy: AttendanceSide;
  reason: ProblemReason;
  description: string;
  createdAt: string;
  answerDeadline: string;
  contestation?: string;
  contestedAt?: string;
  decision?: ProblemDecision;
  decisionJustification?: string;
  decidedAt?: string;
  attachments: ProblemAttachment[];
}

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  aguardando_resposta: 'Aguardando resposta',
  confirmado: 'Confirmado',
  sem_resposta: 'Sem resposta',
  em_disputa: 'Em disputa',
  decidido: 'Decidido',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  agendado: 'Agendado',
  aguardando_reaceite: 'Aguardando reaceite',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  problema_relatado: 'Problema relatado',
  em_disputa: 'Em disputa',
  nao_realizado: 'Não realizado',
};

export const ACTIVE_ATTENDANCE_STATUSES: AttendanceStatus[] = ['agendado', 'aguardando_reaceite', 'em_andamento'];

const CANCELLATION_REASONS: Record<AttendanceCancellationReason, string> = {
  desistencia: 'O atendimento foi cancelado.',
  solicitacao_cancelada: 'A solicitação foi cancelada.',
  proposta_alterada: 'A proposta foi alterada depois do aceite e aguarda um novo aceite do paciente.',
  reaceite_recusado: 'O profissional recusou a nova versão da solicitação.',
  sem_reaceite: 'O início chegou sem o profissional reaceitar a nova versão da solicitação.',
  substituido: 'O paciente escolheu outro profissional para a vaga.',
  edicao_incompativel: 'A nova versão da solicitação não tinha mais vaga para este profissional.',
  admin: 'Um administrador encerrou a solicitação.',
};

export function cancellationDescription(attendance: Attendance): string {
  if (attendance.cancellationReason === 'desistencia') {
    return attendance.cancelledBy === 'paciente' ? 'O paciente cancelou o atendimento.' : 'O profissional cancelou o atendimento.';
  }
  return attendance.cancellationReason ? CANCELLATION_REASONS[attendance.cancellationReason] : 'O atendimento foi cancelado.';
}
