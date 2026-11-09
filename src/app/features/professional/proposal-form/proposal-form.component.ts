import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { PERIOD_ERROR_MESSAGES, buildPeriodControls, fromLocalInputValue, toLocalInputValue } from '../../../core/forms/period-form';
import { PracticeArea } from '../../../core/models';
import { ProposalInput } from '../../../core/services/proposal.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { TextareaComponent } from '../../../shared/ui/forms/textarea/textarea.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [
    InvalidFieldFocusDirective,
    ReactiveFormsModule,
    ButtonComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
  ],
  templateUrl: './proposal-form.component.html',
  styleUrl: './proposal-form.component.scss',
})
export class ProposalFormComponent {
  private readonly fb = inject(FormBuilder);

  initialValue = input<ProposalInput | null>(null);
  submitLabel = input.required<string>();
  submitting = input(false);
  disabled = input(false);
  practiceAreas = input<PracticeArea[]>([]);

  readonly submitted = output<ProposalInput>();

  protected readonly practiceAreaOptions = computed<SelectOption[]>(() =>
    this.practiceAreas().map((area) => ({ value: area.id, label: area.label })),
  );
  protected readonly choosesPracticeArea = computed(() => this.practiceAreas().length > 1);

  protected readonly form = this.fb.nonNullable.group({
    practiceAreaId: [''],
    price: ['', [Validators.required, Validators.min(1)]],
    approach: ['', [Validators.required, Validators.minLength(20)]],
    ...buildPeriodControls(this.fb),
  });

  protected readonly fieldError = fieldErrorsFor(this.form, {
    practiceAreaId: { required: 'Escolha para qual vaga é a proposta.' },
    price: { min: 'Informe um valor válido.' },
    approach: { minlength: 'Descreva sua abordagem com mais detalhes (mínimo 20 caracteres).' },
    ...PERIOD_ERROR_MESSAGES,
  });

  private appliedInitial: string | null = null;

  constructor() {
    effect(() => {
      const control = this.form.controls.practiceAreaId;
      control.setValidators(this.choosesPracticeArea() ? [Validators.required] : []);
      control.updateValueAndValidity();
    });

    effect(() => {
      const value = this.initialValue();
      const key = value ? JSON.stringify(value) : null;
      if (value && key !== this.appliedInitial) {
        this.appliedInitial = key;
        this.form.reset({
          practiceAreaId: value.practiceAreaId ?? '',
          price: String(value.price),
          approach: value.approach,
          start: value.start ? toLocalInputValue(value.start) : '',
          end: value.end ? toLocalInputValue(value.end) : '',
        });
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { practiceAreaId, price, approach, start, end } = this.form.getRawValue();
    const areas = this.practiceAreas();
    this.submitted.emit({
      price: Number(price),
      approach,
      start: fromLocalInputValue(start),
      end: fromLocalInputValue(end),
      practiceAreaId: this.choosesPracticeArea() ? practiceAreaId : areas[0]?.id,
    });
  }
}
