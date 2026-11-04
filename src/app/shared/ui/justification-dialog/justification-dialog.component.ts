import { Component, effect, inject, input, output, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { ButtonVariant } from '../button/button.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { TextareaComponent } from '../forms/textarea/textarea.component';
import { IconName } from '../icon/icon.component';
import { InvalidFieldFocusDirective } from '../forms/invalid-field-focus.directive';

const MAX_LENGTH = 1000;

@Component({
  selector: 'ui-justification-dialog',
  standalone: true,
  imports: [InvalidFieldFocusDirective, ReactiveFormsModule, ConfirmDialogComponent, TextareaComponent],
  template: `
    <ui-confirm-dialog
      [open]="open()"
      [titleText]="titleText()"
      [icon]="icon()"
      [message]="message()"
      [consequences]="consequences()"
      [warning]="warning()"
      [confirmLabel]="confirmLabel()"
      [cancelLabel]="cancelLabel()"
      [confirmVariant]="confirmVariant()"
      [loading]="loading()"
      (confirmed)="confirm()"
      (closed)="closed.emit()"
    >
      <div class="justification-dialog">
        <ng-content></ng-content>
        <form [formGroup]="form" (ngSubmit)="confirm()">
          <ui-textarea
            [label]="fieldLabel()"
            formControlName="justification"
            [hint]="hint()"
            [required]="required()"
            [maxLength]="maxLength"
            [errorMessage]="fieldError('justification')"
          ></ui-textarea>
        </form>
      </div>
    </ui-confirm-dialog>
  `,
  styleUrl: './justification-dialog.component.scss',
})
export class JustificationDialogComponent {
  private readonly fb = inject(FormBuilder);

  open = input.required<boolean>();
  titleText = input.required<string>();
  message = input.required<string>();
  consequences = input<string[]>([]);
  warning = input<string | null>(null);
  icon = input<IconName | null>(null);
  confirmLabel = input.required<string>();
  cancelLabel = input.required<string>();
  confirmVariant = input<ButtonVariant>('primary');
  loading = input(false);
  fieldLabel = input('Justificativa');
  required = input(true);
  hint = input<string | null>('Fica registrada na auditoria e vai na notificação para quem foi afetado.');

  readonly confirmed = output<string>();
  readonly closed = output<void>();

  protected readonly maxLength = MAX_LENGTH;
  protected readonly form = this.fb.nonNullable.group({
    justification: ['', [Validators.maxLength(MAX_LENGTH)]],
  });
  protected readonly fieldError = fieldErrorsFor(this.form, {
    justification: { maxlength: `Use no máximo ${MAX_LENGTH} caracteres.` },
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        untracked(() => this.form.reset({ justification: '' }));
      }
    });
  }

  protected confirm(): void {
    const justification = this.form.getRawValue().justification.trim();
    if (this.form.invalid || (this.required() && !justification)) {
      if (!justification) {
        this.form.controls.justification.setErrors({ required: true });
      }
      this.form.markAllAsTouched();
      return;
    }
    this.confirmed.emit(justification);
  }
}
