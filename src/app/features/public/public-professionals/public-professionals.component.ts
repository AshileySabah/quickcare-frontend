import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { createPagination } from '../../../core/lists/pagination';
import { ATTENDANCE_MODALITY_LABELS, ListViewState, PublicProfessional, PublicSearchFilters } from '../../../core/models';
import { PublicSearchService } from '../../../core/services/public-search.service';
import { AvatarComponent } from '../../../shared/ui/feedback/avatar/avatar.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';
import { StarRatingComponent } from '../../../shared/ui/star-rating/star-rating.component';
import { PublicFiltersComponent } from '../public-filters/public-filters.component';

@Component({
  selector: 'app-public-professionals',
  standalone: true,
  imports: [
    RouterLink,
    AvatarComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PaginatorComponent,
    PublicFiltersComponent,
    SkeletonListComponent,
    StarRatingComponent,
  ],
  templateUrl: './public-professionals.component.html',
  styleUrl: '../public-list.scss',
})
export class PublicProfessionalsComponent {
  private readonly searchService = inject(PublicSearchService);
  protected readonly profileBase: string =
    inject(ActivatedRoute).snapshot.data['profileBase'] ?? '/consulta/profissionais';

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly professionals = signal<PublicProfessional[]>([]);
  protected readonly pager = createPagination(this.professionals);
  protected readonly modalityLabels = ATTENDANCE_MODALITY_LABELS;

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
    this.searchService.professionals(this.filters).subscribe({
      next: (professionals) => {
        this.professionals.set(professionals);
        this.viewState.set(professionals.length ? 'filled' : 'empty');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected areas(professional: PublicProfessional): string {
    return professional.practiceAreas.map((area) => area.label).join(' · ');
  }

  protected average(professional: PublicProfessional): string {
    return (professional.ratings.average ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
}
