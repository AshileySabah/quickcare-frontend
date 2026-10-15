import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  RegistrationData,
  StepDecision,
  ValidationDetail,
  ValidationProfile,
  ValidationStep,
} from '../../../core/models';
import { ValidationService } from '../../../core/services/validation.service';
import { ButtonComponent, ButtonVariant } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { FilePickerComponent } from '../../../shared/ui/forms/file-picker/file-picker.component';
import { formatMasked } from '../../../shared/ui/forms/input/input-mask.util';
import { StoredFileComponent } from '../../../shared/ui/stored-file/stored-file.component';
import { TextareaComponent } from '../../../shared/ui/forms/textarea/textarea.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { ValidationStatusBadgeComponent } from '../../../shared/ui/feedback/validation-status-badge/validation-status-badge.component';
import { PreValidationAlertComponent, PreValidationState } from '../pre-validation-alert/pre-validation-alert.component';

interface LookupLink {
  label: string;
  url: string;
}

/** Sites oficiais para o admin conferir por fora quando não há API (ou ela falhou). */
const LOOKUP_LINKS: Partial<Record<string, LookupLink>> = {
  IDENTIDADE: {
    label: 'Situação do CPF na Receita',
    url: 'https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp',
  },
  CNPJ: {
    label: 'Comprovante de CNPJ na Receita',
    url: 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp',
  },
  'REGISTRO_PROFISSIONAL:MEDICO': {
    label: 'Busca de médicos no CFM',
    url: 'https://portal.cfm.org.br/busca-medicos/',
  },
};

@Component({
  selector: 'app-validation-step-card',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    FilePickerComponent,
    PreValidationAlertComponent,
    StoredFileComponent,
    TextareaComponent,
    ValidationStatusBadgeComponent,
  ],
  templateUrl: './validation-step-card.component.html',
  styleUrl: './validation-step-card.component.scss',
})
export class ValidationStepCardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly validationService = inject(ValidationService);
  private readonly toastService = inject(ToastService);

  profile = input.required<ValidationProfile>();
  validationId = input.required<string>();
  step = input.required<ValidationStep>();
  data = input.required<RegistrationData>();
  /** Rótulo do conselho da categoria (CRM, COREN...), para a etapa de registro. */
  registrationLabel = input('Registro profissional');
  preValidation = input<PreValidationState | undefined>(undefined);

  preValidate = output<void>();
  decided = output<ValidationDetail>();

  private readonly attachmentPicker = viewChild(FilePickerComponent);

  protected readonly deciding = signal<StepDecision['decision'] | null>(null);
  protected readonly attachment = signal<File | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    justification: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
  });

  /** Última sugestão aplicada, para não apagar o que o admin já escreveu por conta própria. */
  private lastSuggestion = '';

  protected readonly isPending = computed(() => this.step().status === 'pendente');

  protected readonly isPreValidating = computed(() => this.preValidation()?.status === 'loading');

  protected readonly opinion = computed(() => {
    const state = this.preValidation();
    return state?.status === 'done' ? state.result.opinion : null;
  });

  protected readonly approveVariant = computed<ButtonVariant>(() =>
    this.opinion() === 'desfavoravel' ? 'secondary' : 'primary',
  );

  protected readonly rejectVariant = computed<ButtonVariant>(() =>
    this.opinion() === 'desfavoravel' ? 'danger' : 'danger-outline',
  );

  protected readonly lookupLink = computed(() => {
    const type = this.step().type;
    return LOOKUP_LINKS[`${type}:${this.data().category}`] ?? LOOKUP_LINKS[type] ?? null;
  });

  constructor() {
    effect(() => {
      const state = this.preValidation();
      if (state?.status !== 'done') {
        return;
      }

      const control = this.form.controls.justification;
      if (control.value === '' || control.value === this.lastSuggestion) {
        control.setValue(state.result.suggestedJustification);
        this.lastSuggestion = state.result.suggestedJustification;
      }
    });
  }

  protected formatCpf(cpf: string): string {
    return formatMasked('cpf', cpf);
  }

  protected formatCnpj(cnpj: string | null): string {
    return cnpj ? formatMasked('cnpj', cnpj) : 'Não informado';
  }

  protected justificationError(): string | null {
    const control = this.form.controls.justification;

    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'A justificativa é obrigatória para aprovar ou reprovar.';
    }
    if (control.hasError('minlength')) {
      return 'Descreva com mais detalhes (mínimo 10 caracteres).';
    }
    return null;
  }

  protected onAttachmentChange(file: File | null): void {
    this.attachment.set(file);
  }

  protected decide(decision: StepDecision['decision']): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.deciding.set(decision);

    this.validationService
      .decide(this.profile(), this.validationId(), this.step().type, {
        decision,
        justification: this.form.controls.justification.value.trim(),
        attachment: this.attachment() ?? undefined,
      })
      .subscribe({
        next: (detail) => {
          this.deciding.set(null);
          this.form.reset();
          this.lastSuggestion = '';
          this.attachmentPicker()?.clear();
          this.toastService.success(`Etapa "${this.step().label}" ${decision === 'aprovada' ? 'aprovada' : 'reprovada'}.`);
          this.decided.emit(detail);
        },
        error: (error: Error) => {
          this.deciding.set(null);
          this.toastService.error(error.message);
        },
      });
  }
}
