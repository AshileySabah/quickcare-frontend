import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { formatPeriod } from '../../../core/formatting/period';
import { CardComponent } from '../layout/card/card.component';
import { NoticeComponent } from '../feedback/notice/notice.component';
import { StatusBadgeComponent } from '../feedback/status-badge/status-badge.component';
import { Proposal } from '../../../core/models';

@Component({
  selector: 'ui-proposal-card',
  standalone: true,
  imports: [CurrencyPipe, CardComponent, NoticeComponent, StatusBadgeComponent],
  templateUrl: './proposal-card.component.html',
  styleUrl: './proposal-card.component.scss',
})
export class ProposalCardComponent {
  proposal = input.required<Proposal>();
  personHiddenNote = input<string | null>(null);
  subtitle = input<string | null>(null);
  notice = input<string | null>(null);

  protected readonly period = computed(() => formatPeriod(this.proposal().start, this.proposal().end));
}
