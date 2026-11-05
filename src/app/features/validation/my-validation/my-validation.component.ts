import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ProfessionalCategoryInfo, ValidationDetail, ValidationProfile } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { UfService } from '../../../core/services/uf.service';
import { ValidationService } from '../../../core/services/validation.service';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SelectOption } from '../../../shared/ui/forms/select/select.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { MyStepCardComponent } from '../my-step-card/my-step-card.component';

type ViewState = 'loading' | 'error' | 'filled';

@Component({
  selector: 'app-my-validation',
  standalone: true,
  imports: [SkeletonListComponent, ErrorStateComponent, MyStepCardComponent],
  templateUrl: './my-validation.component.html',
  styleUrl: './my-validation.component.scss',
})
export class MyValidationComponent implements OnInit {
  private readonly validationService = inject(ValidationService);
  private readonly ufService = inject(UfService);
  private readonly specialtyService = inject(SpecialtyService);

  profile = input.required<ValidationProfile>();

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly detail = signal<ValidationDetail | null>(null);
  protected readonly ufOptions = signal<SelectOption[]>([]);
  private readonly categories = signal<ProfessionalCategoryInfo[]>([]);

  protected readonly canAddCnpj = computed(() => {
    const detail = this.detail();
    return this.profile() === 'professional' && !!detail && !detail.steps.some((step) => step.type === 'CNPJ');
  });
  protected readonly blockedAction = computed(() =>
    this.profile() === 'patient' ? 'criar novas solicitações' : 'enviar novas propostas',
  );

  ngOnInit(): void {
    this.ufService.list().subscribe((ufs) => this.ufOptions.set(ufs));
    if (this.profile() === 'professional') {
      this.specialtyService.listCategories().subscribe((categories) => this.categories.set(categories));
    }
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

  protected registrationLabel(detail: ValidationDetail): string {
    return (
      this.categories().find((category) => category.value === detail.data.category)?.registrationLabel ??
      'Registro profissional'
    );
  }
}
