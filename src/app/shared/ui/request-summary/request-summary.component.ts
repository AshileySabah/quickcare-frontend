import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import {
  ServiceRequest,
  formatRequestAddress,
  requestedProfessionalsSummary,
  requestedSpecialtyNames,
} from '../../../core/models';
import { StatusBadgeComponent } from '../feedback/status-badge/status-badge.component';
import { CardComponent } from '../layout/card/card.component';

/**
 * Card com o resumo de uma solicitação (o que foi pedido, modalidade,
 * endereço e prazo), igual para paciente e profissional. As ações de cada
 * tela entram projetadas no rodapé do card.
 */
@Component({
  selector: 'ui-request-summary',
  standalone: true,
  imports: [DatePipe, CardComponent, StatusBadgeComponent],
  templateUrl: './request-summary.component.html',
  styleUrl: './request-summary.component.scss',
})
export class RequestSummaryComponent {
  request = input.required<ServiceRequest>();
  /** Quantas vagas de cada linha já têm proposta aceita (interessa ao paciente). */
  showVacancies = input(false);

  protected readonly professionalsSummary = requestedProfessionalsSummary;
  protected readonly formatAddress = formatRequestAddress;
  protected readonly specialtyNames = requestedSpecialtyNames;
}
