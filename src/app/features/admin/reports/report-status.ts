import { ReportStatus } from '../../../core/models';
import { BadgeVariant } from '../../../shared/ui/feedback/badge/badge.component';

export const REPORT_STATUS_VARIANTS: Record<ReportStatus, BadgeVariant> = {
  em_analise: 'warning',
  procedente: 'error',
  improcedente: 'neutral',
};
