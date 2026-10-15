import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import {
  cnpjValidator,
  cpfValidator,
  identityDocumentValidator,
  normalizeIdentityNumber,
} from '../../../core/forms/document-validators';
import {
  IdentityDocumentType,
  RegistrationData,
  StepResubmission,
  ValidationDetail,
  ValidationProfile,
  ValidationStep,
} from '../../../core/models';
import { ValidationService } from '../../../core/services/validation.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FilePickerComponent } from '../../../shared/ui/forms/file-picker/file-picker.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

type FieldName =
  | 'name'
  | 'cpf'
  | 'identityDocumentType'
  | 'identityDocumentNumber'
  | 'identityDocumentUf'
  | 'cnpj'
  | 'registrationNumber'
  | 'registrationUf';

const IDENTITY_DOCUMENT_OPTIONS: SelectOption[] = [
  { value: 'RG', label: 'RG' },
  { value: 'CNH', label: 'CNH' },
];

/**
 * Correção de uma etapa reprovada: o usuário ajusta os dados daquela etapa e
 * envia um novo documento, abrindo uma nova avaliação.
 */
@Component({
  selector: 'app-resubmit-step-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FilePickerComponent,
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
  step = input.required<ValidationStep>();
  data = input.required<RegistrationData>();
  ufOptions = input<SelectOption[]>([]);
  registrationLabel = input('Registro profissional');

  resubmitted = output<ValidationDetail>();

  protected readonly identityDocumentOptions = IDENTITY_DOCUMENT_OPTIONS;
  protected readonly isSubmitting = signal(false);
  protected readonly document = signal<File | null>(null);
  protected readonly documentError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: [''],
      cpf: [''],
      identityDocumentType: [''],
      identityDocumentNumber: [''],
      identityDocumentUf: [''],
      cnpj: [''],
      registrationNumber: [''],
      registrationUf: [''],
    },
    { validators: identityDocumentValidator() },
  );

  ngOnInit(): void {
    const data = this.data();
    this.form.patchValue({
      name: data.name,
      cpf: data.cpf,
      identityDocumentType: data.identityDocumentType ?? '',
      identityDocumentNumber: data.identityDocumentNumber ?? '',
      identityDocumentUf: data.identityDocumentUf ?? '',
      cnpj: data.cnpj ?? '',
      registrationNumber: data.registrationNumber ?? '',
      registrationUf: data.registrationUf ?? '',
    });

    // Só os campos da etapa reenviada são obrigatórios.
    const required: Record<string, ValidatorFn[]> =
      this.step().type === 'IDENTIDADE'
        ? {
            name: [Validators.required, Validators.maxLength(150)],
            cpf: [Validators.required, Validators.pattern(/^\d{11}$/), cpfValidator()],
            identityDocumentType: [Validators.required],
            identityDocumentNumber: [Validators.required],
          }
        : this.step().type === 'CNPJ'
          ? { cnpj: [Validators.required, Validators.pattern(/^\d{14}$/), cnpjValidator()] }
          : { registrationNumber: [Validators.required, Validators.maxLength(50)], registrationUf: [Validators.required] };

    for (const [name, validators] of Object.entries(required)) {
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
    if (!document) {
      this.documentError.set('Envie o documento atualizado.');
    }
    if (this.form.invalid || !document) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const input: StepResubmission =
      this.step().type === 'IDENTIDADE'
        ? {
            document,
            name: value.name.trim(),
            cpf: value.cpf,
            identityDocumentType: value.identityDocumentType as IdentityDocumentType,
            identityDocumentNumber: normalizeIdentityNumber(value.identityDocumentNumber),
            identityDocumentUf: this.isRg ? value.identityDocumentUf : undefined,
          }
        : this.step().type === 'CNPJ'
          ? { document, cnpj: value.cnpj }
          : { document, registrationNumber: value.registrationNumber.trim(), registrationUf: value.registrationUf };

    this.isSubmitting.set(true);
    this.validationService.resubmit(this.profile(), this.step().type, input).subscribe({
      next: (detail) => {
        this.isSubmitting.set(false);
        this.authService.updateValidationStatus(detail.status);
        if (input.name) {
          this.authService.updateCurrentUser(input.name, this.authService.currentUser()?.avatarUrl ?? null);
        }
        this.toastService.success('Etapa reenviada. Ela volta para análise.');
        this.resubmitted.emit(detail);
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
