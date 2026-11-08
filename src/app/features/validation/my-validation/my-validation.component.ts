import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ValidationDetail, ValidationProfile, ValidationStepStatus } from '../../../core/models';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';
import { UfService } from '../../../core/services/uf.service';
import { ValidationService } from '../../../core/services/validation.service';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SelectOption } from '../../../shared/ui/forms/select/select.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { MyStepCardComponent } from '../my-step-card/my-step-card.component';

type ViewState = 'loading' | 'error' | 'filled';

const STATUS_FILTERS: FilterChip<ValidationStepStatus | null>[] = [
  { value: null, label: 'Todos' },
  { value: 'pendente', label: 'Em análise' },
  { value: 'reprovada', label: 'Reprovados' },
  { value: 'aprovada', label: 'Aprovados' },
];

@Component({
  selector: 'app-my-validation',
  standalone: true,
  imports: [SkeletonListComponent, ErrorStateComponent, FilterChipsComponent, MyStepCardComponent],
  templateUrl: './my-validation.component.html',
  styleUrl: './my-validation.component.scss',
})
export class MyValidationComponent implements OnInit {
  private readonly validationService = inject(ValidationService);
  private readonly ufService = inject(UfService);

  profile = input.required<ValidationProfile>();

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly detail = signal<ValidationDetail | null>(null);
  protected readonly ufOptions = signal<SelectOption[]>([]);

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly statusFilter = signal<ValidationStepStatus | null>(null);
  protected readonly visibleSteps = computed(() => {
    const status = this.statusFilter();
    const steps = this.detail()?.steps ?? [];
    return status ? steps.filter((step) => step.status === status) : steps;
  });

  protected readonly canAddCnpj = computed(() => {
    const detail = this.detail();
    return (
      this.profile() === 'professional' &&
      this.statusFilter() === null &&
      !!detail &&
      !detail.steps.some((step) => step.type === 'CNPJ')
    );
  });
  protected readonly blockedAction = computed(() =>
    this.profile() === 'patient' ? 'criar novas solicitações' : 'enviar novas propostas',
  );

  ngOnInit(): void {
    this.ufService.list().subscribe((ufs) => this.ufOptions.set(ufs));
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.validationService.getMine(this.profile()).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.viewState.set('filled');
      },
      error: () => this.viewState.set('error'),
    });
  }
}
