import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { ProfessionalCategoryInfo, ValidationDetail, ValidationProfile } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { UfService } from '../../../core/services/uf.service';
import { ValidationService } from '../../../core/services/validation.service';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SelectOption } from '../../../shared/ui/forms/select/select.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { StoredFileComponent } from '../../../shared/ui/stored-file/stored-file.component';
import { ValidationStatusBadgeComponent } from '../../../shared/ui/feedback/validation-status-badge/validation-status-badge.component';
import { ResubmitStepFormComponent } from '../resubmit-step-form/resubmit-step-form.component';

type ViewState = 'loading' | 'error' | 'filled';

/** Andamento da validação do próprio cadastro, com reenvio das etapas reprovadas. */
@Component({
  selector: 'app-my-validation',
  standalone: true,
  imports: [
    DatePipe,
    CardComponent,
    ErrorStateComponent,
    ResubmitStepFormComponent,
    SkeletonComponent,
    StoredFileComponent,
    ValidationStatusBadgeComponent,
  ],
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

  protected onResubmitted(detail: ValidationDetail): void {
    this.detail.set(detail);
  }

  protected registrationLabel(detail: ValidationDetail): string {
    return (
      this.categories().find((category) => category.value === detail.data.category)?.registrationLabel ??
      'Registro profissional'
    );
  }
}
