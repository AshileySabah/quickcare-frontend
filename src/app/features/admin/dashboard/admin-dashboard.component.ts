import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ListViewState, ProfessionalCategoryInfo, ValidationProfile, ValidationStatus, ValidationSummary } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { ValidationService } from '../../../core/services/validation.service';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { ValidationStatusBadgeComponent } from '../../../shared/ui/feedback/validation-status-badge/validation-status-badge.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';

const STATUS_FILTERS: FilterChip<ValidationStatus | null>[] = [
  { value: 'pendente', label: 'Em análise' },
  { value: 'reprovado', label: 'Reprovados' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: null, label: 'Todos' },
];

/** Fila de validação cadastral de um perfil (profissionais ou pacientes), vindo da rota. */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [SkeletonListComponent,
    DatePipe,
    FilterChipsComponent,
    RouterLink,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ValidationStatusBadgeComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly validationService = inject(ValidationService);
  private readonly specialtyService = inject(SpecialtyService);

  protected readonly profile = this.route.snapshot.data['profile'] as ValidationProfile;
  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly selectedStatus = signal<ValidationStatus | null>('pendente');

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly entries = signal<ValidationSummary[]>([]);
  private readonly categories = signal<ProfessionalCategoryInfo[]>([]);

  constructor() {
    if (this.profile === 'professional') {
      this.specialtyService.listCategories().subscribe((categories) => this.categories.set(categories));
    }
    this.load();
  }

  protected get title(): string {
    return this.profile === 'professional' ? 'Validação de profissionais' : 'Validação de pacientes';
  }

  protected get detailBasePath(): string {
    return this.profile === 'professional' ? '/admin/profissionais' : '/admin/pacientes';
  }

  protected selectStatus(status: ValidationStatus | null): void {
    this.selectedStatus.set(status);
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.validationService.list(this.profile, this.selectedStatus() ?? undefined).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.viewState.set(entries.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected categoryLabel(entry: ValidationSummary): string {
    return this.categories().find((category) => category.value === entry.category)?.label ?? entry.category ?? '';
  }

  protected pendingStepsLabel(entry: ValidationSummary): string {
    if (entry.pendingSteps === 0) {
      return 'Nenhuma etapa aguardando avaliação';
    }
    return entry.pendingSteps === 1 ? '1 etapa aguardando avaliação' : `${entry.pendingSteps} etapas aguardando avaliação`;
  }
}
