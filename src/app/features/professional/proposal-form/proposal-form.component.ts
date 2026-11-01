import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { ProposalInput } from '../../../core/services/proposal.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { TextareaComponent } from '../../../shared/ui/forms/textarea/textarea.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';

/**
 * Valor, prazo e abordagem da proposta, para enviar ou editar. Só valida e
 * emite o valor; quem usa decide o que fazer com ele.
 */
@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, GridComponent, GridItemComponent, InputComponent, TextareaComponent],
  templateUrl: './proposal-form.component.html',
  styleUrl: './proposal-form.component.scss',
})
export class ProposalFormComponent {
  private readonly fb = inject(FormBuilder);

  /** Valores de uma proposta existente, ao editar. */
  initialValue = input<ProposalInput | null>(null);
  submitLabel = input.required<string>();
  submitting = input(false);

  readonly submitted = output<ProposalInput>();

  protected readonly form = this.fb.nonNullable.group({
    price: ['', [Validators.required, Validators.min(1)]],
    approach: ['', [Validators.required, Validators.minLength(20)]],
    deadline: ['', Validators.required],
  });

  protected readonly fieldError = fieldErrorsFor(this.form, {
    price: { min: 'Informe um valor válido.' },
    approach: { minlength: 'Descreva sua abordagem com mais detalhes (mínimo 20 caracteres).' },
  });

  constructor() {
    effect(() => {
      const value = this.initialValue();
      if (value) {
        this.form.reset({ price: String(value.price), approach: value.approach, deadline: value.deadline });
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { price, approach, deadline } = this.form.getRawValue();
    this.submitted.emit({ price: Number(price), approach, deadline });
  }
}
