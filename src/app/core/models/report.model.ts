import { AdminAction, AdminParty } from './admin.model';
import { AttendanceSide, AttendanceStatus } from './attendance.model';
import { AppealStatus } from './occurrence.model';

export type ReportReason =
  | 'comportamento_inadequado'
  | 'desrespeito_ou_assedio'
  | 'negligencia'
  | 'cobranca_indevida'
  | 'fraude'
  | 'perfil_falso'
  | 'outro';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  comportamento_inadequado: 'Comportamento inadequado',
  desrespeito_ou_assedio: 'Desrespeito ou assédio',
  negligencia: 'Negligência no atendimento',
  cobranca_indevida: 'Cobrança indevida ou fora da plataforma',
  fraude: 'Fraude ou golpe',
  perfil_falso: 'Perfil ou documentos falsos',
  outro: 'Outro motivo',
};

export type ReportStatus = 'aberta' | 'em_analise' | 'procedente' | 'improcedente';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  procedente: 'Procedente',
  improcedente: 'Improcedente',
};

export type ReportConsequence = 'ocorrencia' | 'banimento';

export const REPORT_CONSEQUENCE_LABELS: Record<ReportConsequence, string> = {
  ocorrencia: 'Lançar ocorrência',
  banimento: 'Banir',
};

export type ReportTargetKind = 'patient' | 'professional';

export interface ReportInput {
  reason: ReportReason;
  description: string;
  attachment?: File;
}

export interface ReportSummary {
  id: string;
  status: ReportStatus;
  reason: ReportReason;
  reasonLabel: string;
  reporter: AttendanceSide;
  patient: AdminParty;
  professional: AdminParty;
  patientId: string;
  professionalId: string;
  createdAt: string;
}

export interface ReportAttendance {
  id: string;
  requestId: string;
  service: string;
  status: AttendanceStatus;
  start: string;
  end: string;
}

export interface ReportOccurrence {
  id: string;
  annulled: boolean;
  appeal?: {
    id: string;
    status: AppealStatus;
    text: string;
    createdAt: string;
    decisionJustification?: string;
    decidedAt?: string;
  };
}

export interface ReportDetail {
  summary: ReportSummary;
  description: string;
  attachment?: { fileName: string; contentType: string; url: string };
  consequence?: ReportConsequence;
  decisionJustification?: string;
  analysisStartedAt?: string;
  analyzedBy?: string;
  decidedAt?: string;
  decidedBy?: string;
  occurrence?: ReportOccurrence;
  attendances: ReportAttendance[];
  otherReportsAgainstReported: number;
  actions: AdminAction[];
}

export interface ReportDecisionInput {
  result: 'procedente' | 'improcedente';
  consequence?: ReportConsequence;
  justification: string;
}
