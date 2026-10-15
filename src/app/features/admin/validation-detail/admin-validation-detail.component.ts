import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ProfessionalCategoryInfo,
  ValidationDetail,
  ValidationProfile,
  ValidationStepType,
} from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { ValidationService } from '../../../core/services/validation.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { formatMasked } from '../../../shared/ui/forms/input/input-mask.util';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { ValidationStatusBadgeComponent } from '../../../shared/ui/feedback/validation-status-badge/validation-status-badge.component';
import { PreValidationState } from '../pre-validation-alert/pre-validation-alert.component';
import { ValidationStepCardComponent } from '../validation-step-card/validation-step-card.component';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

/**
 * Validação de um cadastro, etapa por etapa. A pré-validação com APIs de
 * terceiros é opcional: pode rodar em todas as etapas pendentes de uma vez
 * (uma consulta por etapa, em paralelo) ou em cada uma separadamente.
 */
@Component({
  selector: 'app-admin-validation-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    ValidationStatusBadgeComponent,
    ValidationStepCardComponent,
  ],
  templateUrl: './admin-validation-detail.component.html',
  styleUrl: './admin-validation-detail.component.scss',
})
export class AdminValidationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly validationService = inject(ValidationService);
  private readonly specialtyService = inject(SpecialtyService);

  protected readonly profile = this.route.snapshot.data['profile'] as ValidationProfile;
  private readonly validationId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly detail = signal<ValidationDetail | null>(null);
  protected readonly preValidations = signal<Partial<Record<ValidationStepType, PreValidationState>>>({});
  private readonly categories = signal<ProfessionalCategoryInfo[]>([]);

  protected readonly pendingSteps = computed(() => this.detail()?.steps.filter((step) => step.status === 'pendente') ?? []);

  protected readonly preValidatingCount = computed(
    () => Object.values(this.preValidations()).filter((state) => state?.status === 'loading').length,
  );

  constructor() {
    if (this.profile === 'professional') {
      this.specialtyService.listCategories().subscribe((categories) => this.categories.set(categories));
    }
    this.load();
  }

  protected get backLink(): string {
    return this.profile === 'professional' ? '/admin/profissionais' : '/admin/pacientes';
  }

  protected load(): void {
    this.pageState.set('loading');

    this.validationService.getForAdmin(this.profile, this.validationId).subscribe({
      next: (detail) => {
        if (!detail) {
          this.pageState.set('not-found');
          return;
        }
        this.detail.set(detail);
        this.pageState.set('filled');
      },
      error: () => this.pageState.set('error'),
    });
  }

  /** Dispara uma consulta por etapa pendente; cada seção mostra o próprio andamento. */
  protected preValidateAll(): void {
    for (const step of this.pendingSteps()) {
      this.preValidate(step.type);
    }
  }

  protected preValidate(stepType: ValidationStepType): void {
    this.setPreValidation(stepType, { status: 'loading' });

    this.validationService.preValidate(this.profile, this.validationId, stepType).subscribe({
      next: (result) => this.setPreValidation(stepType, { status: 'done', result }),
      error: (error: Error) => this.setPreValidation(stepType, { status: 'error', message: error.message }),
    });
  }

  protected onDecided(stepType: ValidationStepType, detail: ValidationDetail): void {
    this.detail.set(detail);
    this.preValidations.update(({ [stepType]: _decided, ...others }) => others);
  }

  protected categoryLabel(detail: ValidationDetail): string {
    return this.categories().find((category) => category.value === detail.data.category)?.label ?? detail.data.category ?? '';
  }

  protected registrationLabel(detail: ValidationDetail): string {
    return (
      this.categories().find((category) => category.value === detail.data.category)?.registrationLabel ??
      'Registro profissional'
    );
  }

  protected formatCep(cep: string): string {
    return formatMasked('cep', cep);
  }

  protected formatPhone(phone: string | null): string {
    return phone ? formatMasked('phone', phone) : 'Não informado';
  }

  private setPreValidation(stepType: ValidationStepType, state: PreValidationState): void {
    this.preValidations.update((current) => ({ ...current, [stepType]: state }));
  }
}
