import { Component, computed, input } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { ProposalStatus, RequestStatus } from '../../../core/models';

export type DomainStatus = RequestStatus | ProposalStatus;

interface StatusPresentation {
  label: string;
  variant: BadgeVariant;
}

const STATUS_PRESENTATION: Record<DomainStatus, StatusPresentation> = {
  aberta: { label: 'Aberta', variant: 'neutral' },
  recebendo_propostas: { label: 'Recebendo propostas', variant: 'info' },
  em_andamento: { label: 'Em andamento', variant: 'primary' },
  concluida: { label: 'Concluída', variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'error' },
  pendente: { label: 'Pendente', variant: 'neutral' },
  aceita: { label: 'Aceita', variant: 'success' },
  recusada: { label: 'Recusada', variant: 'error' },
};

@Component({
  selector: 'ui-status-badge',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './status-badge.component.html',
})
export class StatusBadgeComponent {
  status = input.required<DomainStatus>();

  protected readonly presentation = computed(() => STATUS_PRESENTATION[this.status()]);
}
