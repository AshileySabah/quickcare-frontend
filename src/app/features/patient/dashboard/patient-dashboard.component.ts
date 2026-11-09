import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { createListFilters } from '../../../core/lists/list-filters';
import {
  REQUEST_SORTS,
  modalityFilter,
  requestCategoryFilter,
  requestSearchText,
  requestStatusFilter,
} from '../../../core/lists/request-filters';
import { ListViewState, RequestStatus, ServiceRequest } from '../../../core/models';
import { CANCEL_REQUEST_CONSEQUENCES, RequestService, hasAcceptedProposals } from '../../../core/services/request.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { ListFiltersComponent } from '../../../shared/ui/list-filters/list-filters.component';
import { MyValidationComponent } from '../../validation/my-validation/my-validation.component';
import { RequestCardComponent } from '../request-card/request-card.component';
import { OccurrencesCardComponent } from '../../occurrences/occurrences-card/occurrences-card.component';
import { HighlightDirective } from '../../../shared/ui/highlight/highlight.directive';
import { CreationLockService } from '../../../core/services/creation-lock.service';
import { BlockedNoticeComponent } from '../../occurrences/blocked-notice/blocked-notice.component';
import { PendingRatingsCardComponent } from '../../ratings/pending-ratings-card/pending-ratings-card.component';
import { BanNoticeComponent } from '../../bans/ban-notice/ban-notice.component';

const ACTIVE_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas', 'em_andamento'];

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [HighlightDirective,
    BlockedNoticeComponent,
    OccurrencesCardComponent,
    PendingRatingsCardComponent,
    BanNoticeComponent,
    RouterLink,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    GridComponent,
    GridItemComponent,
    ListFiltersComponent,
    MyValidationComponent,
    RequestCardComponent,
    SkeletonListComponent,
  ],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.scss',
})
export class PatientDashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly requestService = inject(RequestService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  protected readonly validationStatus = computed(() => {
    const user = this.authService.currentUser();
    return user?.role === 'patient' ? user.validationStatus : 'aprovado';
  });

  protected readonly showValidation = signal(false);
  protected readonly lock = inject(CreationLockService).lockFor('patient');

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);

  protected readonly requestToCancel = signal<ServiceRequest | null>(null);
  protected readonly isCancelling = signal(false);
  protected readonly cancelConsequences = CANCEL_REQUEST_CONSEQUENCES;
  protected readonly confirmingCancel = signal(false);

  protected readonly filters = createListFilters(this.fb, this.requests, {
    searchPlaceholder: 'Descrição, especialidade, bairro...',
    searchText: requestSearchText,
    selects: [
      requestStatusFilter(ACTIVE_STATUSES, 'Todas as ativas'),
      modalityFilter((request: ServiceRequest) => request.modality),
      requestCategoryFilter(this.requests),
    ],
    sorts: [REQUEST_SORTS.recentes, REQUEST_SORTS.antigas, REQUEST_SORTS.prazo],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.requestService.list().subscribe({
      next: (requests) => {
        const active = requests.filter((request) => ACTIVE_STATUSES.includes(request.status));
        this.requests.set(active);
        this.viewState.set(active.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected proposalCount(request: ServiceRequest): number {
    return request.proposalCount;
  }

  protected canEdit(request: ServiceRequest): boolean {
    return this.requestService.canEdit(request);
  }

  protected canCancel(request: ServiceRequest): boolean {
    return this.requestService.canCancel(request);
  }

  protected askToCancel(request: ServiceRequest): void {
    this.requestToCancel.set(request);
    if (hasAcceptedProposals(request)) {
      this.confirmingCancel.set(true);
    } else {
      this.confirmCancel();
    }
  }

  protected closeCancelModal(): void {
    if (!this.isCancelling()) {
      this.confirmingCancel.set(false);
      this.requestToCancel.set(null);
    }
  }

  protected confirmCancel(): void {
    const request = this.requestToCancel();

    if (!request) {
      return;
    }

    this.isCancelling.set(true);

    this.requestService.cancel(request.id).subscribe({
      next: (updated) => {
        const remaining = this.requests().filter((item) => item.id !== updated.id);
        this.requests.set(remaining);
        this.viewState.set(remaining.length === 0 ? 'empty' : 'filled');
        this.isCancelling.set(false);
        this.confirmingCancel.set(false);
        this.requestToCancel.set(null);
        this.toastService.info('Solicitação cancelada. Ela agora aparece no histórico.');
      },
      error: (error: Error) => {
        this.isCancelling.set(false);
        this.toastService.error(error.message);
      },
    });
  }

}
