import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { createPagination } from '../../../core/lists/pagination';
import { ListViewState, PublicRequest, PublicSearchFilters } from '../../../core/models';
import { PublicSearchService } from '../../../core/services/public-search.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';
import { PublicFiltersComponent } from '../public-filters/public-filters.component';

@Component({
  selector: 'app-public-requests',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PaginatorComponent,
    PublicFiltersComponent,
    SkeletonListComponent,
  ],
  templateUrl: './public-requests.component.html',
  styleUrl: '../public-list.scss',
})
export class PublicRequestsComponent {
  private readonly searchService = inject(PublicSearchService);
  private readonly user = inject(AuthService).currentUser;

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly requests = signal<PublicRequest[]>([]);
  protected readonly pager = createPagination(this.requests);

  protected readonly isProfessional = computed(() => this.user()?.role === 'professional');
  protected readonly isLoggedOut = computed(() => !this.user());

  private filters: PublicSearchFilters = {};

  constructor() {
    this.load();
  }

  protected search(filters: PublicSearchFilters): void {
    this.filters = filters;
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.searchService.requests(this.filters).subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.viewState.set(requests.length ? 'filled' : 'empty');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected place(request: PublicRequest): string {
    return request.modality === 'online' ? 'Online' : `Presencial · ${request.city}/${request.state}`;
  }
}
