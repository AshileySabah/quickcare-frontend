import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminRequestSummary, ListViewState, REQUEST_STATUS_LABELS, RequestStatus } from '../../../core/models';
import { AdminRequestService } from '../../../core/services/admin/admin-request.service';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';

const STATUS_FILTERS: FilterChip<RequestStatus | null>[] = [
  { value: null, label: 'Todas' },
  ...(Object.entries(REQUEST_STATUS_LABELS) as [RequestStatus, string][]).map(([value, label]) => ({ value, label })),
];

/** Todas as solicitações, para o admin achar uma e mudar o status. */
@Component({
  selector: 'app-admin-requests',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FilterChipsComponent,
    InputComponent,
    SkeletonListComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './admin-requests.component.html',
  styleUrl: './admin-requests.component.scss',
})
export class AdminRequestsComponent {
  private readonly requestService = inject(AdminRequestService);

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly status = signal<RequestStatus | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly requests = signal<AdminRequestSummary[]>([]);

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load());
    this.load();
  }

  protected selectStatus(status: RequestStatus | null): void {
    this.status.set(status);
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.requestService.list({ status: this.status() ?? undefined, search: this.search.value }).subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.viewState.set(requests.length ? 'filled' : 'empty');
      },
      error: () => this.viewState.set('error'),
    });
  }
}
