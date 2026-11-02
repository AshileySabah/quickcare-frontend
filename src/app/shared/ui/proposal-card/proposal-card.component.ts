import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { formatPeriod } from '../../../core/formatting/period';
import { CardComponent } from '../layout/card/card.component';
import { NoticeComponent } from '../feedback/notice/notice.component';
import { StatusBadgeComponent } from '../feedback/status-badge/status-badge.component';
import { Proposal } from '../../../core/models';

/**
 * Card da proposta. No topo vai a outra parte (o profissional, para o
 * paciente; o paciente, para o profissional) pelo slot proposal-person — a
 * tela decide o que dá para fazer com ela (ver perfil, bloquear). Aceita, o
 * período sai daqui e vai para o atendimento (slot proposal-attendance).
 */
@Component({
  selector: 'ui-proposal-card',
  standalone: true,
  imports: [CurrencyPipe, CardComponent, NoticeComponent, StatusBadgeComponent],
  templateUrl: './proposal-card.component.html',
  styleUrl: './proposal-card.component.scss',
})
export class ProposalCardComponent {
  proposal = input.required<Proposal>();
  /** Mostrado no lugar da pessoa enquanto ela não é revelada. */
  personHiddenNote = input<string | null>(null);
  subtitle = input<string | null>(null);
  /** Destaque acima do valor (ex.: a proposta voltou a aguardar aceite). */
  notice = input<string | null>(null);

  protected readonly period = computed(() => formatPeriod(this.proposal().start, this.proposal().end));
}
