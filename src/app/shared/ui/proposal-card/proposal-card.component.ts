import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { CardComponent } from '../card/card.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { VerifiedBadgeComponent } from '../verified-badge/verified-badge.component';
import { ProfessionalValidationStatus, Proposal } from '../../../core/models';

@Component({
  selector: 'ui-proposal-card',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, CardComponent, StatusBadgeComponent, VerifiedBadgeComponent],
  templateUrl: './proposal-card.component.html',
  styleUrl: './proposal-card.component.scss',
})
export class ProposalCardComponent {
  proposal = input.required<Proposal>();
  professionalName = input.required<string>();
  professionalValidationStatus = input<ProfessionalValidationStatus | null>(null);
  specialtyName = input<string | null>(null);
}
