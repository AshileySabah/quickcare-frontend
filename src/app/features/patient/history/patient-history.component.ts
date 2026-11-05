import { Component, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { createListFilters } from '../../../core/lists/list-filters';
import {
  REQUEST_SORTS,
  modalityFilter,
  requestCategoryFilter,
  requestSearchText,
  requestStatusFilter,
} from '../../../core/lists/request-filters';
import { ListViewState, RequestStatus, ServiceRequest } from '../../../core/models';
import { RequestService } from '../../../core/services/request.service';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { RequestCardComponent } from '../request-card/request-card.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ListFiltersComponent } from '../../../shared/ui/list-filters/list-filters.component';
import { CreationLockService } from '../../../core/services/creation-lock.service';

const CLOSED_STATUSES: RequestStatus[] = ['concluida', 'cancelada'];

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [ListFiltersComponent, SkeletonListComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    GridComponent,
    GridItemComponent,
    RequestCardComponent,
  ],
  templateUrl: './patient-history.component.html',
  styleUrl: './patient-history.component.scss',
})
export class PatientHistoryComponent {
  private readonly fb = inject(FormBuilder);
  private readonly requestService = inject(RequestService);
  protected readonly blocked = inject(CreationLockService).lockFor('patient');

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);

  protected readonly filters = createListFilters(this.fb, this.requests, {
    searchPlaceholder: 'Descrição, especialidade, bairro...',
    searchText: requestSearchText,
    selects: [
      requestStatusFilter(CLOSED_STATUSES, 'Todas'),
      modalityFilter((request: ServiceRequest) => request.modality),
      requestCategoryFilter(this.requests),
    ],
    sorts: [REQUEST_SORTS.recentes, REQUEST_SORTS.antigas],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.requestService.list().subscribe({
      next: (requests) => {
        const closed = requests.filter((request) => CLOSED_STATUSES.includes(request.status));
        this.requests.set(closed);
        this.viewState.set(closed.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }
}
