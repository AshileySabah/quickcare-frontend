import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, PatientRegistration } from '../../../core/auth/auth.service';
import { DocumentType } from '../../../core/models';
import { EmergencyContactGroup, buildEmergencyContactGroup } from '../../../core/forms/emergency-contact-form';
import { AddressComponent } from '../../../shared/ui/address/address.component';
import { AvatarUploadComponent } from '../../../shared/ui/avatar-upload/avatar-upload.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { CheckboxComponent } from '../../../shared/ui/checkbox/checkbox.component';
import { DocumentUploaderComponent, UploadedDocument } from '../../../shared/ui/document-uploader/document-uploader.component';
import { GridItemComponent } from '../../../shared/ui/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/grid/grid.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { PasswordFieldsComponent } from '../../../shared/ui/password-fields/password-fields.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { TextareaComponent } from '../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'OUTRO', label: 'Outro' },
  { value: 'PREFIRO_NAO_INFORMAR', label: 'Prefiro não informar' },
];

const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'VALIDACAO_CPF', label: 'Documento de identidade (RG/CNH)' },
  { value: 'OUTRO', label: 'Outro' },
];

function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordsMismatch: true } : null;
  };
}

function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    const valid = value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
    return valid ? null : { weakPassword: true };
  };
}

type FieldName = 'name' | 'email' | 'phone' | 'cpf' | 'birthDate' | 'gender' | 'infoConfirmedTrue' | 'lgpdConsent' | 'password';
type AddressFieldName = 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state';

@Component({
  selector: 'app-patient-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AddressComponent,
    AvatarUploadComponent,
    ButtonComponent,
    CardComponent,
    CheckboxComponent,
    DocumentUploaderComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    PasswordFieldsComponent,
    SelectComponent,
    TextareaComponent,
  ],
  templateUrl: './patient-register.component.html',
  styleUrl: './patient-register.component.scss',
})
export class PatientRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly avatarBlob = signal<Blob | null>(null);
  protected readonly genderOptions = GENDER_OPTIONS;
  protected readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;

  protected readonly documents = signal<UploadedDocument[]>([]);
  protected readonly documentsError = signal<string | null>(null);

  protected onAvatarChange(blob: Blob | null): void {
    this.avatarBlob.set(blob);
  }

  protected onDocumentsChange(documents: UploadedDocument[]): void {
    this.documents.set(documents);
    if (documents.length > 0) {
      this.documentsError.set(null);
    }
  }

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      birthDate: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
      allergies: [''],
      healthConditions: [''],
      medicationsInUse: [''],
      infoConfirmedTrue: [false, [Validators.requiredTrue]],
      lgpdConsent: [false, [Validators.requiredTrue]],
      address: this.fb.nonNullable.group({
        cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
        street: ['', Validators.required],
        number: ['', Validators.required],
        complement: [''],
        neighborhood: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
      }),
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator() },
  );

  protected get emergencyContacts(): FormArray {
    return this.form.controls.emergencyContacts;
  }

  protected addEmergencyContact(): void {
    this.emergencyContacts.push(buildEmergencyContactGroup(this.fb));
  }

  protected removeEmergencyContact(index: number): void {
    this.emergencyContacts.removeAt(index);
  }

  protected emergencyContactFieldError(index: number, fieldName: 'name' | 'phone'): string | null {
    const control = this.emergencyContacts.at(index).get(fieldName);

    if (!control || !control.touched || !control.hasError('required')) {
      return null;
    }

    return 'Campo obrigatório.';
  }

  protected fieldError = (fieldName: FieldName): string | null => {
    const control = this.form.controls[fieldName];

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (fieldName === 'email' && control.hasError('email')) {
      return 'E-mail inválido.';
    }

    if (fieldName === 'password' && control.hasError('weakPassword')) {
      return 'A senha não atende aos requisitos mínimos.';
    }

    if (fieldName === 'cpf' && control.hasError('pattern')) {
      return 'CPF deve conter 11 dígitos, sem pontuação.';
    }

    if ((fieldName === 'infoConfirmedTrue' || fieldName === 'lgpdConsent') && control.hasError('required')) {
      return 'Esta confirmação é obrigatória.';
    }

    return null;
  };

  protected addressFieldError = (fieldName: string): string | null => {
    const control = this.form.controls.address.get(fieldName as AddressFieldName);

    if (!control || !control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (fieldName === 'cep' && control.hasError('pattern')) {
      return 'CEP deve conter 8 dígitos, sem hífen.';
    }

    if (fieldName === 'state' && control.hasError('pattern')) {
      return 'Informe a sigla do estado (ex.: SP).';
    }

    return null;
  };

  protected get passwordError(): string | null {
    return this.fieldError('password');
  }

  protected get confirmPasswordError(): string | null {
    const control = this.form.controls.confirmPassword;

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Confirme sua senha.';
    }

    if (this.form.hasError('passwordsMismatch')) {
      return 'As senhas não coincidem.';
    }

    return null;
  }

  protected submit(): void {
    const documents = this.documents();
    const hasCpfDocument = documents.some((document) => document.type === 'VALIDACAO_CPF');

    if (!hasCpfDocument) {
      this.documentsError.set('Envie um documento que valide seu CPF.');
    }

    if (this.form.invalid || !hasCpfDocument) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const {
      name,
      email,
      phone,
      cpf,
      birthDate,
      gender,
      emergencyContacts,
      allergies,
      healthConditions,
      medicationsInUse,
      infoConfirmedTrue,
      lgpdConsent,
      password,
      address,
    } = this.form.getRawValue();

    this.authService
      .registerPatient({
        name,
        email,
        phone,
        cpf,
        birthDate,
        gender: gender as PatientRegistration['gender'],
        emergencyContacts,
        infoConfirmedTrue,
        lgpdConsent,
        allergies: allergies || undefined,
        healthConditions: healthConditions || undefined,
        medicationsInUse: medicationsInUse || undefined,
        password,
        address: {
          cep: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement || undefined,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        },
        documents: documents.map((document) => ({ file: document.file, type: document.type as DocumentType })),
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastService.success('Cadastro realizado com sucesso!');
          this.router.navigateByUrl('/patient');
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);
          this.toastService.error(error.message);
        },
      });
  }
}
