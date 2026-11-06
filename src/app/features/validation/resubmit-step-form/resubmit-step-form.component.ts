import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import {
  cnpjValidator,
  cpfValidator,
  identityDocumentValidator,
  normalizeIdentityNumber,
} from '../../../core/forms/document-validators';
import {
  Gender,
  IdentityDocumentType,
  RegistrationData,
  StepResubmission,
  ValidationDetail,
  ValidationProfile,
  ValidationStep,
  ValidationStepType,
} from '../../../core/models';
import { ValidationService } from '../../../core/services/validation.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FileReplacerComponent } from '../../../shared/ui/forms/file-replacer/file-replacer.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';
import { GENDER_OPTIONS, IDENTITY_DOCUMENT_OPTIONS } from '../../../shared/ui/register/register-options';

type FieldName =
  | 'cpf'
  | 'identityDocumentType'
  | 'identityDocumentNumber'
  | 'identityDocumentUf'
  | 'birthDate'
  | 'gender'
  | 'cnpj'
  | 'registrationNumber'
  | 'registrationUf';

const FIELDS_BY_STEP: Record<ValidationStepType, FieldName[]> = {
  CPF: ['cpf'],
  IDENTIDADE: ['identityDocumentType', 'identityDocumentNumber', 'identityDocumentUf', 'birthDate', 'gender'],
  CNPJ: ['cnpj'],
  REGISTRO_PROFISSIONAL: ['registrationNumber', 'registrationUf'],
};

@Component({
  selector: 'app-resubmit-step-form',
  standalone: true,
  imports: [
    InvalidFieldFocusDirective,
    ReactiveFormsModule,
    ButtonComponent,
    ConfirmDialogComponent,
    FileReplacerComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    SelectComponent,
  ],
  templateUrl: './resubmit-step-form.component.html',
  styleUrl: './resubmit-step-form.component.scss',
})
export class ResubmitStepFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly validationService = inject(ValidationService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  profile = input.required<ValidationProfile>();
  type = input.required<ValidationStepType>();
  step = input<ValidationStep | null>(null);
  data = input.required<RegistrationData>();
  ufOptions = input<SelectOption[]>([]);
  registrationLabel = input('Registro profissional');

  resubmitted = output<ValidationDetail>();
  cancelled = output<void>();

  protected readonly identityDocumentOptions = IDENTITY_DOCUMENT_OPTIONS;
  protected readonly genderOptions = GENDER_OPTIONS;
  protected readonly isSubmitting = signal(false);
  protected readonly document = signal<File | null>(null);
  protected readonly documentError = signal<string | null>(null);
  protected readonly confirmingUnchanged = signal(false);
  protected readonly unchangedConsequences = [
    'Os dados e o documento continuam os mesmos.',
    'Mesmo assim, a etapa volta para a análise do administrador.',
  ];

  protected readonly title = computed(() => {
    switch (this.step()?.status) {
      case 'reprovada':
        return 'Corrija o que for preciso e envie de novo';
      case 'pendente':
        return 'Atualize os dados ou o documento antes da análise';
      case 'aprovada':
        return 'Altere os dados, o documento ou os dois';
      default:
        return 'Informe o CNPJ e envie o documento que o comprova';
    }
  });
  protected readonly note = computed(() =>
    this.step()?.status === 'aprovada'
      ? `Os dados voltam para análise do administrador. Enquanto isso, você continua usando a plataforma, mas não pode ${
          this.profile() === 'patient' ? 'criar novas solicitações' : 'enviar novas propostas'
        }.`
      : null,
  );

  protected readonly form = this.fb.nonNullable.group(
    {
      cpf: [''],
      identityDocumentType: [''],
      identityDocumentNumber: [''],
      identityDocumentUf: [''],
      birthDate: [''],
      gender: [''],
      cnpj: [''],
      registrationNumber: [''],
      registrationUf: [''],
    },
    { validators: identityDocumentValidator() },
  );

  private initialValue = this.form.getRawValue();

  ngOnInit(): void {
    const data = this.data();
    this.form.patchValue({
      cpf: data.cpf,
      identityDocumentType: data.identityDocumentType ?? '',
      identityDocumentNumber: data.identityDocumentNumber ?? '',
      identityDocumentUf: data.identityDocumentUf ?? '',
      birthDate: data.birthDate ?? '',
      gender: data.gender ?? '',
      cnpj: data.cnpj ?? '',
      registrationNumber: data.registrationNumber ?? '',
      registrationUf: data.registrationUf ?? '',
    });
    this.initialValue = this.form.getRawValue();

    const required: Record<ValidationStepType, Partial<Record<FieldName, ValidatorFn[]>>> = {
      CPF: { cpf: [Validators.required, Validators.pattern(/^\d{11}$/), cpfValidator()] },
      IDENTIDADE: {
        identityDocumentType: [Validators.required],
        identityDocumentNumber: [Validators.required],
        birthDate: [Validators.required],
        gender: [Validators.required],
      },
      CNPJ: { cnpj: [Validators.required, Validators.pattern(/^\d{14}$/), cnpjValidator()] },
      REGISTRO_PROFISSIONAL: {
        registrationNumber: [Validators.required, Validators.maxLength(50)],
        registrationUf: [Validators.required],
      },
    };

    for (const [name, validators] of Object.entries(required[this.type()])) {
      const control = this.form.get(name);
      control?.setValidators(validators);
      control?.updateValueAndValidity();
    }
  }

  protected get isRg(): boolean {
    return this.form.controls.identityDocumentType.value === 'RG';
  }

  protected fieldError = (fieldName: FieldName): string | null => {
    const control = this.form.controls[fieldName];

    if (!control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }
    if (control.hasError('pattern')) {
      return fieldName === 'cpf' ? 'CPF deve conter 11 dígitos.' : 'CNPJ deve conter 14 dígitos.';
    }
    if (control.hasError('cpfInvalid')) {
      return 'CPF inválido.';
    }
    if (control.hasError('cnpjInvalid')) {
      return 'CNPJ inválido.';
    }
    if (fieldName === 'identityDocumentNumber' && this.form.hasError('identityDocumentInvalid')) {
      return this.form.getError('identityDocumentInvalid') as string;
    }
    if (fieldName === 'identityDocumentUf' && this.form.hasError('identityDocumentUfRequired')) {
      return 'Informe a UF que emitiu o RG.';
    }
    return null;
  };

  protected onDocumentChange(file: File | null): void {
    this.document.set(file);
    if (file) {
      this.documentError.set(null);
    }
  }

  protected submit(): void {
    const document = this.document();
    const value = this.form.getRawValue();
    const changed = FIELDS_BY_STEP[this.type()].some((field) => value[field] !== this.initialValue[field]);

    this.documentError.set(!document && !this.step()?.document ? 'Envie o documento desta etapa.' : null);
    if (this.form.invalid || this.documentError()) {
      this.form.markAllAsTouched();
      return;
    }
    if (!changed && !document) {
      this.confirmingUnchanged.set(true);
      return;
    }
    this.send();
  }

  protected confirmUnchanged(): void {
    this.confirmingUnchanged.set(false);
    this.send();
  }

  private send(): void {
    const document = this.document() ?? undefined;
    const value = this.form.getRawValue();
    const inputs: Record<ValidationStepType, () => StepResubmission> = {
      CPF: () => ({ document, cpf: value.cpf }),
      IDENTIDADE: () => ({
        document,
        identityDocumentType: value.identityDocumentType as IdentityDocumentType,
        identityDocumentNumber: normalizeIdentityNumber(value.identityDocumentNumber),
        identityDocumentUf: this.isRg ? value.identityDocumentUf : undefined,
        birthDate: value.birthDate,
        gender: value.gender as Gender,
      }),
      CNPJ: () => ({ document, cnpj: value.cnpj }),
      REGISTRO_PROFISSIONAL: () => ({
        document,
        registrationNumber: value.registrationNumber.trim(),
        registrationUf: value.registrationUf,
      }),
    };
    const input = inputs[this.type()]();

    this.isSubmitting.set(true);
    this.validationService.resubmit(this.profile(), this.type(), input).subscribe({
      next: (detail) => {
        this.isSubmitting.set(false);
        this.authService.updateValidationStatus(detail.status);
        this.toastService.success('Enviado para validação. Você será avisado quando o administrador analisar.');
        this.resubmitted.emit(detail);
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
