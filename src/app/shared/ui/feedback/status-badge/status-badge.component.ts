import { Component, computed, input } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import {
  ATTENDANCE_STATUS_LABELS,
  AttendanceStatus,
  PROBLEM_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
  ProblemStatus,
  ProposalStatus,
  REQUEST_STATUS_LABELS,
  RequestStatus,
} from '../../../../core/models';

export type DomainStatus = RequestStatus | ProposalStatus | AttendanceStatus | ProblemStatus;

interface StatusPresentation {
  label: string;
  variant: BadgeVariant;
}

const REQUEST_VARIANTS: Record<RequestStatus, BadgeVariant> = {
  aberta: 'neutral',
  recebendo_propostas: 'info',
  em_andamento: 'primary',
  concluida: 'success',
  cancelada: 'error',
};

const ATTENDANCE_VARIANTS: Record<AttendanceStatus, BadgeVariant> = {
  agendado: 'info',
  aguardando_reaceite: 'warning',
  em_andamento: 'primary',
  finalizado: 'success',
  concluido: 'success',
  cancelado: 'error',
  problema_relatado: 'warning',
  em_disputa: 'warning',
  nao_realizado: 'error',
};

const PROBLEM_VARIANTS: Record<ProblemStatus, BadgeVariant> = {
  aguardando_resposta: 'info',
  confirmado: 'neutral',
  sem_resposta: 'neutral',
  em_disputa: 'warning',
  decidido: 'success',
};

const PROPOSAL_VARIANTS: Record<ProposalStatus, BadgeVariant> = {
  pendente: 'neutral',
  aceita: 'success',
  recusada: 'error',
  cancelada: 'neutral',
};

@Component({
  selector: 'ui-status-badge',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './status-badge.component.html',
})
export class StatusBadgeComponent {
  status = input.required<DomainStatus>();
  kind = input<'request' | 'proposal' | 'attendance' | 'problem'>('request');

  protected readonly presentation = computed<StatusPresentation>(() => {
    if (this.kind() === 'attendance') {
      const status = this.status() as AttendanceStatus;
      return { label: ATTENDANCE_STATUS_LABELS[status], variant: ATTENDANCE_VARIANTS[status] };
    }
    if (this.kind() === 'problem') {
      const status = this.status() as ProblemStatus;
      return { label: PROBLEM_STATUS_LABELS[status], variant: PROBLEM_VARIANTS[status] };
    }
    if (this.kind() === 'proposal') {
      const status = this.status() as ProposalStatus;
      return { label: PROPOSAL_STATUS_LABELS[status], variant: PROPOSAL_VARIANTS[status] };
    }
    const status = this.status() as RequestStatus;
    return { label: REQUEST_STATUS_LABELS[status], variant: REQUEST_VARIANTS[status] };
  });
}
