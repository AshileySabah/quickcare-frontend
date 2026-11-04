import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { createListFilters } from '../../../core/lists/list-filters';
import {
  REQUEST_SORTS,
  modalityFilter,
  requestSearchText,
  requestSpecialtyFilter,
} from '../../../core/lists/request-filters';
import { RouterLink } from '@angular/router';
import { RequestService } from '../../../core/services/request.service';
import { ListViewState, requestedProfessionalsSummary, ServiceRequest } from '../../../core/models';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ListFiltersComponent } from '../../../shared/ui/list-filters/list-filters.component';
import { OccurrencesCardComponent } from '../../occurrences/occurrences-card/occurrences-card.component';
import { BlockedNoticeComponent } from '../../occurrences/blocked-notice/blocked-notice.component';

@Component({
  selector: 'app-professional-home',
  standalone: true,
  imports: [BlockedNoticeComponent, OccurrencesCardComponent,ListFiltersComponent, SkeletonListComponent, DatePipe, RouterLink, CardComponent, EmptyStateComponent, ErrorStateComponent, StatusBadgeComponent],
  templateUrl: './professional-home.component.html',
  styleUrl: './professional-home.component.scss',
})
export class ProfessionalHomeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly requestService = inject(RequestService);

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);

  protected readonly filters = createListFilters(this.fb, this.requests, {
    searchPlaceholder: 'Descrição, especialidade, bairro...',
    searchText: requestSearchText,
    selects: [modalityFilter((request: ServiceRequest) => request.modality), requestSpecialtyFilter(this.requests)],
    sorts: [REQUEST_SORTS.recentes, REQUEST_SORTS.prazo, REQUEST_SORTS.antigas],
  });

  protected readonly professionalsSummary = requestedProfessionalsSummary;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.requestService.listAvailable().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.viewState.set(requests.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }
}
