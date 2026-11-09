import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListViewState, ValidationProfile, ValidationStatus, ValidationSummary } from '../../../core/models';
import { ValidationService } from '../../../core/services/validation.service';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { ValidationStatusBadgeComponent } from '../../../shared/ui/feedback/validation-status-badge/validation-status-badge.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { BadgeComponent } from '../../../shared/ui/feedback/badge/badge.component';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';
import { createPagination } from '../../../core/lists/pagination';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';

const PROFILE_FILTERS: FilterChip<ValidationProfile>[] = [
  { value: 'professional', label: 'Profissionais' },
  { value: 'patient', label: 'Pacientes' },
];

const PROFILE_PARAM: Record<ValidationProfile, string> = { professional: 'profissionais', patient: 'pacientes' };

type StatusFilter = ValidationStatus | 'revalidacao' | null;

const STATUS_FILTERS: FilterChip<StatusFilter>[] = [
  { value: 'pendente', label: 'Em análise' },
  { value: 'revalidacao', label: 'Em revalidação' },
  { value: 'reprovado', label: 'Reprovados' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: null, label: 'Todos' },
];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [PaginatorComponent, SkeletonListComponent,
    DatePipe,
    FilterChipsComponent,
    RouterLink,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ValidationStatusBadgeComponent,
    BadgeComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  private readonly router = inject(Router);
  private readonly validationService = inject(ValidationService);

  protected readonly profile = signal<ValidationProfile>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('perfil') === PROFILE_PARAM.patient ? 'patient' : 'professional',
  );
  protected readonly profileFilters = PROFILE_FILTERS;
  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly selectedStatus = signal<StatusFilter>('pendente');

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly entries = signal<ValidationSummary[]>([]);
  protected readonly pager = createPagination(this.entries);

  constructor() {
    this.load();
  }

  protected get detailBasePath(): string {
    return this.profile() === 'professional' ? '/admin/profissionais' : '/admin/pacientes';
  }

  protected selectProfile(profile: ValidationProfile): void {
    this.profile.set(profile);
    this.router.navigate([], { queryParams: { perfil: PROFILE_PARAM[profile] }, replaceUrl: true });
    this.load();
  }

  protected selectStatus(status: StatusFilter): void {
    this.selectedStatus.set(status);
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.validationService.list(this.profile(), this.selectedStatus() ?? undefined).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.viewState.set(entries.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected practiceAreasLabel(entry: ValidationSummary): string {
    return entry.practiceAreas.join(' · ');
  }

  protected pendingStepsLabel(entry: ValidationSummary): string {
    if (entry.pendingSteps === 0) {
      return 'Nenhuma etapa aguardando avaliação';
    }
    return entry.pendingSteps === 1 ? '1 etapa aguardando avaliação' : `${entry.pendingSteps} etapas aguardando avaliação`;
  }
}
