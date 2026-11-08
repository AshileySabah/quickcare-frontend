import { ReportStatus } from '../../../core/models';
import { BadgeVariant } from '../../../shared/ui/feedback/badge/badge.component';

export const REPORT_STATUS_VARIANTS: Record<ReportStatus, BadgeVariant> = {
  aberta: 'warning',
  em_analise: 'info',
  procedente: 'error',
  improcedente: 'neutral',
};
