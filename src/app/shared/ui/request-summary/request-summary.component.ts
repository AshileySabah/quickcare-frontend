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

@Component({
  selector: 'ui-request-summary',
  standalone: true,
  imports: [DatePipe, CardComponent, StatusBadgeComponent],
  templateUrl: './request-summary.component.html',
  styleUrl: './request-summary.component.scss',
})
export class RequestSummaryComponent {
  request = input.required<ServiceRequest>();
  showVacancies = input(false);

  protected readonly professionalsSummary = requestedProfessionalsSummary;
  protected readonly formatAddress = formatRequestAddress;
  protected readonly specialtyNames = requestedSpecialtyNames;
}
