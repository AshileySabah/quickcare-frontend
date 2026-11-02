import { Component, computed, input } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { PROPOSAL_STATUS_LABELS, ProposalStatus, REQUEST_STATUS_LABELS, RequestStatus } from '../../../../core/models';

export type DomainStatus = RequestStatus | ProposalStatus;

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
  /** Solicitação e proposta têm status com o mesmo nome ("cancelada") e significados diferentes. */
  kind = input<'request' | 'proposal'>('request');

  protected readonly presentation = computed<StatusPresentation>(() => {
    if (this.kind() === 'proposal') {
      const status = this.status() as ProposalStatus;
      return { label: PROPOSAL_STATUS_LABELS[status], variant: PROPOSAL_VARIANTS[status] };
    }
    const status = this.status() as RequestStatus;
    return { label: REQUEST_STATUS_LABELS[status], variant: REQUEST_VARIANTS[status] };
  });
}
