import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PracticeArea, ValidationDetail, ValidationProfile, ValidationStep } from '../../../core/models';
import { ValidationService } from '../../../core/services/validation.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { formatMasked } from '../../../shared/ui/forms/input/input-mask.util';
import { ValidationStatusBadgeComponent } from '../../../shared/ui/feedback/validation-status-badge/validation-status-badge.component';
import { PreValidationState } from '../pre-validation-alert/pre-validation-alert.component';
import { ValidationStepCardComponent } from '../validation-step-card/validation-step-card.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { BadgeComponent } from '../../../shared/ui/feedback/badge/badge.component';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

@Component({
  selector: 'app-admin-validation-detail',
  standalone: true,
  imports: [BackLinkComponent, SkeletonListComponent, NgTemplateOutlet,
    DatePipe,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ValidationStatusBadgeComponent,
    ValidationStepCardComponent,
    BadgeComponent,
  ],
  templateUrl: './admin-validation-detail.component.html',
  styleUrl: './admin-validation-detail.component.scss',
})
export class AdminValidationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly validationService = inject(ValidationService);

  protected readonly profile = this.route.snapshot.data['profile'] as ValidationProfile;
  private readonly validationId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly detail = signal<ValidationDetail | null>(null);
  protected readonly preValidations = signal<Partial<Record<string, PreValidationState>>>({});

  protected readonly pendingSteps = computed(() => this.detail()?.steps.filter((step) => step.status === 'pendente') ?? []);
  protected readonly visibleSteps = computed(() => {
    const detail = this.detail();
    if (!detail) {
      return [];
    }
    return detail.revalidating ? detail.steps.filter((step) => step.status !== 'aprovada') : detail.steps;
  });
  protected readonly unchangedSteps = computed(() => {
    const detail = this.detail();
    return detail?.revalidating ? detail.steps.filter((step) => step.status === 'aprovada') : [];
  });

  protected readonly preValidatingCount = computed(
    () => Object.values(this.preValidations()).filter((state) => state?.status === 'loading').length,
  );

  constructor() {
    this.load();
  }

  protected readonly backLink = '/admin/validacao';

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

  protected preValidateAll(): void {
    for (const step of this.pendingSteps()) {
      this.preValidate(step);
    }
  }

  protected preValidationOf(step: ValidationStep): PreValidationState | undefined {
    return this.preValidations()[step.key];
  }

  protected preValidate(step: ValidationStep): void {
    this.setPreValidation(step.key, { status: 'loading' });

    this.validationService.preValidate(this.profile, this.validationId, step).subscribe({
      next: (result) => this.setPreValidation(step.key, { status: 'done', result }),
      error: (error: Error) => this.setPreValidation(step.key, { status: 'error', message: error.message }),
    });
  }

  protected onDecided(step: ValidationStep, detail: ValidationDetail): void {
    this.detail.set(detail);
    this.preValidations.update(({ [step.key]: _decided, ...others }) => others);
  }

  protected specialtyNames(area: PracticeArea): string {
    return area.specialties.map((specialty) => specialty.name).join(', ');
  }

  protected practiceAreasLabel(detail: ValidationDetail): string {
    return detail.data.practiceAreas.map((area) => area.label).join(', ') || 'Profissional';
  }

  protected formatCep(cep: string): string {
    return formatMasked('cep', cep);
  }

  protected formatPhone(phone: string | null): string {
    return phone ? formatMasked('phone', phone) : 'Não informado';
  }

  private setPreValidation(key: string, state: PreValidationState): void {
    this.preValidations.update((current) => ({ ...current, [key]: state }));
  }
}
