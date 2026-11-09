import { Component, ElementRef, afterNextRender, effect, inject, Injector, input, output, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { REPORT_REASON_LABELS, ReportInput, ReportReason, ReportTargetKind } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { FilePickerComponent } from '../../../shared/ui/forms/file-picker/file-picker.component';
import { revealFirstInvalid } from '../../../shared/ui/forms/invalid-field-focus.directive';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { TextareaComponent } from '../../../shared/ui/forms/textarea/textarea.component';

export interface ReportTarget {
  kind: ReportTargetKind;
  id: string;
  name: string;
}

const MAX_DESCRIPTION = 2000;

@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent, FilePickerComponent, SelectComponent, TextareaComponent],
  templateUrl: './report-dialog.component.html',
  styleUrl: './report-dialog.component.scss',
})
export class ReportDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  target = input<ReportTarget | null>(null);
  loading = input(false);

  readonly submitted = output<ReportInput>();
  readonly closed = output<void>();

  protected readonly maxDescription = MAX_DESCRIPTION;
  protected readonly reasonOptions: SelectOption[] = (Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map(
    (reason) => ({ value: reason, label: REPORT_REASON_LABELS[reason] }),
  );

  protected readonly form = this.fb.nonNullable.group({
    reason: this.fb.nonNullable.control<ReportReason | ''>('', Validators.required),
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(MAX_DESCRIPTION)]],
  });
  protected readonly fieldError = fieldErrorsFor(this.form, {
    reason: { required: 'Escolha o motivo da denúncia.' },
    description: {
      required: 'Conte o que aconteceu.',
      minlength: 'Escreva pelo menos 10 caracteres.',
      maxlength: `Use no máximo ${MAX_DESCRIPTION} caracteres.`,
    },
  });

  protected readonly consequences = [
    'Um administrador analisa a denúncia e decide se ela procede.',
    'A pessoa denunciada não fica sabendo que foi você.',
    'Você recebe uma notificação quando a denúncia for julgada.',
  ];

  private attachment: File | undefined;

  constructor() {
    effect(() => {
      if (this.target()) {
        untracked(() => {
          this.form.reset({ reason: '', description: '' });
          this.attachment = undefined;
        });
      }
    });
  }

  protected message(): string {
    const target = this.target();
    return target ? `Denunciar ${target.name}?` : '';
  }

  protected setAttachment(file: File | null): void {
    this.attachment = file ?? undefined;
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      afterNextRender(() => revealFirstInvalid(this.host.nativeElement), { injector: this.injector });
      return;
    }
    const { reason, description } = this.form.getRawValue();
    this.submitted.emit({ reason: reason as ReportReason, description, attachment: this.attachment });
  }
}
