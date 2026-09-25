import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, ProfessionalRegistration } from '../../../core/auth/auth.service';
import { EmergencyContactGroup, buildEmergencyContactGroup } from '../../../core/forms/emergency-contact-form';
import { DocumentType, ProfessionalCategory, ProfessionalCategoryInfo, Specialty } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { AddressComponent } from '../../../shared/ui/address/address.component';
import { AvatarUploadComponent } from '../../../shared/ui/avatar-upload/avatar-upload.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { CheckboxComponent } from '../../../shared/ui/checkbox/checkbox.component';
import { DocumentUploaderComponent, UploadedDocument } from '../../../shared/ui/document-uploader/document-uploader.component';
import { GridItemComponent } from '../../../shared/ui/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/grid/grid.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { MultiSelectComponent, MultiSelectOption } from '../../../shared/ui/multi-select/multi-select.component';
import { PasswordFieldsComponent } from '../../../shared/ui/password-fields/password-fields.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'OUTRO', label: 'Outro' },
  { value: 'PREFIRO_NAO_INFORMAR', label: 'Prefiro não informar' },
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

function atLeastOneModalityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const presencial = control.get('attendsPresencial')?.value;
    const remoto = control.get('attendsRemoto')?.value;
    return presencial || remoto ? null : { modalityRequired: true };
  };
}

type FieldName =
  | 'name'
  | 'email'
  | 'phone'
  | 'cpf'
  | 'cnpj'
  | 'category'
  | 'specialtyIds'
  | 'specialtySingle'
  | 'registrationNumber'
  | 'birthDate'
  | 'gender'
  | 'infoConfirmedTrue'
  | 'lgpdConsent'
  | 'raioAtendimentoKm'
  | 'password';

type AddressFieldName = 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state';

@Component({
  selector: 'app-professional-register',
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
    MultiSelectComponent,
    PasswordFieldsComponent,
    SelectComponent,
  ],
  templateUrl: './professional-register.component.html',
  styleUrl: './professional-register.component.scss',
})
export class ProfessionalRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly avatarBlob = signal<Blob | null>(null);
  protected readonly genderOptions = GENDER_OPTIONS;

  protected onAvatarChange(blob: Blob | null): void {
    this.avatarBlob.set(blob);
  }

  protected readonly categoryOptions = signal<ProfessionalCategoryInfo[]>([]);

  private readonly specialties = signal<Specialty[]>([]);
  private readonly selectedCategory = signal<ProfessionalCategory | ''>('');
  private readonly hasCnpj = signal(false);

  protected readonly specialtyOptions = computed<MultiSelectOption[]>(() =>
    this.specialties()
      .filter((specialty) => specialty.category === this.selectedCategory())
      .map((specialty) => ({ value: specialty.id, label: specialty.name })),
  );

  protected readonly documentTypeOptions = computed<SelectOption[]>(() => {
    const options: SelectOption[] = [{ value: 'VALIDACAO_CPF', label: 'Documento de identidade (RG/CNH)' }];

    if (this.hasCnpj()) {
      options.push({ value: 'VALIDACAO_CNPJ', label: 'CNPJ' });
    }

    if (this.selectedCategory() !== '' && this.selectedCategory() !== 'CUIDADOR') {
      options.push({ value: 'REGISTRO_PROFISSIONAL', label: this.registrationLabel });
    }

    options.push({ value: 'OUTRO', label: 'Outro' });
    return options;
  });

  protected readonly documents = signal<UploadedDocument[]>([]);
  protected readonly documentsError = signal<string | null>(null);

  protected onDocumentsChange(documents: UploadedDocument[]): void {
    this.documents.set(documents);
    if (documents.length > 0) {
      this.documentsError.set(null);
    }
  }

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      cnpj: ['', [Validators.pattern(/^\d{14}$/)]],
      category: this.fb.nonNullable.control<ProfessionalCategory | ''>('', Validators.required),
      specialtyIds: this.fb.nonNullable.control<string[]>([], Validators.required),
      specialtySingle: [''],
      registrationNumber: [''],
      birthDate: ['', Validators.required],
      gender: ['', Validators.required],
      emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
      infoConfirmedTrue: [false, Validators.requiredTrue],
      lgpdConsent: [false, Validators.requiredTrue],
      hasLiabilityInsurance: [false],
      attendsPresencial: [false],
      attendsRemoto: [false],
      raioAtendimentoKm: [10, [Validators.min(1)]],
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
      confirmPassword: ['', Validators.required],
    },
    { validators: [passwordsMatchValidator(), atLeastOneModalityValidator()] },
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

  constructor() {
    this.form.controls.attendsPresencial.valueChanges.subscribe((presencial) => {
      const raioControl = this.form.controls.raioAtendimentoKm;

      if (presencial) {
        raioControl.setValidators([Validators.required, Validators.min(1)]);
      } else {
        raioControl.clearValidators();
      }

      raioControl.updateValueAndValidity();
    });

    // Registration belongs to the professional's own council (CRM, COREN...), not to
    // each specialty. Cuidadores have no regulating council, so they carry no
    // registration number at all — this toggles the field's required-ness and resets
    // the specialty selection whenever the category changes.
    this.form.controls.category.valueChanges.subscribe((category) => {
      this.selectedCategory.set(category);
      this.form.controls.specialtyIds.setValue([]);
      this.form.controls.specialtySingle.setValue('');

      const registrationControl = this.form.controls.registrationNumber;
      if (category === 'CUIDADOR' || category === '') {
        registrationControl.clearValidators();
      } else {
        registrationControl.setValidators([Validators.required, Validators.maxLength(50)]);
      }
      registrationControl.updateValueAndValidity();
    });

    // Category "Outros profissionais" is single-specialty, so its picker writes into
    // a dedicated control that mirrors into the shared specialtyIds array.
    this.form.controls.specialtySingle.valueChanges.subscribe((specialtyId) => {
      if (this.form.controls.category.value === 'OUTRO') {
        this.form.controls.specialtyIds.setValue(specialtyId ? [specialtyId] : []);
      }
    });

    this.form.controls.cnpj.valueChanges.subscribe((value) => this.hasCnpj.set(!!value));
  }

  ngOnInit(): void {
    this.specialtyService.list().subscribe((specialties) => {
      this.specialties.set(specialties);
    });

    this.specialtyService.listCategories().subscribe((categories) => {
      this.categoryOptions.set(categories);
    });
  }

  protected get isOutro(): boolean {
    return this.form.controls.category.value === 'OUTRO';
  }

  protected get requiresRegistration(): boolean {
    const category = this.form.controls.category.value;
    return category !== '' && category !== 'CUIDADOR';
  }

  protected get requiresCnpjDocument(): boolean {
    return !!this.form.controls.cnpj.value;
  }

  protected get registrationLabel(): string {
    const category = this.form.controls.category.value;
    return this.categoryOptions().find((option) => option.value === category)?.registrationLabel ?? 'Registro profissional';
  }

  protected get modalityError(): string | null {
    const touched = this.form.controls.attendsPresencial.touched || this.form.controls.attendsRemoto.touched;
    return touched && this.form.hasError('modalityRequired') ? 'Selecione ao menos uma modalidade de atendimento.' : null;
  }

  protected fieldError = (fieldName: FieldName): string | null => {
    const control = this.form.controls[fieldName];

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      if (fieldName === 'specialtyIds' || fieldName === 'specialtySingle') {
        return 'Selecione ao menos uma especialidade.';
      }
      if (fieldName === 'category') {
        return 'Selecione uma categoria profissional.';
      }
      if (fieldName === 'registrationNumber') {
        return 'Informe o número de registro profissional.';
      }
      if (fieldName === 'infoConfirmedTrue' || fieldName === 'lgpdConsent') {
        return 'Esta confirmação é obrigatória.';
      }
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

    if (fieldName === 'cnpj' && control.hasError('pattern')) {
      return 'CNPJ deve conter 14 dígitos, sem pontuação.';
    }

    if (fieldName === 'raioAtendimentoKm' && control.hasError('min')) {
      return 'Informe um raio de atendimento válido.';
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
    const hasCnpjDocument = documents.some((document) => document.type === 'VALIDACAO_CNPJ');
    const hasRegistrationDocument = documents.some((document) => document.type === 'REGISTRO_PROFISSIONAL');

    let documentsValid = true;

    if (!hasCpfDocument) {
      this.documentsError.set('Envie um documento que valide seu CPF.');
      documentsValid = false;
    }

    if (this.requiresCnpjDocument && !hasCnpjDocument) {
      this.documentsError.set('Envie um documento que valide o CNPJ informado.');
      documentsValid = false;
    }

    if (this.requiresRegistration && !hasRegistrationDocument) {
      this.documentsError.set('Envie um documento que valide seu registro profissional.');
      documentsValid = false;
    }

    if (this.form.invalid || !documentsValid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const {
      name,
      email,
      phone,
      cpf,
      cnpj,
      category,
      specialtyIds,
      registrationNumber,
      birthDate,
      gender,
      emergencyContacts,
      infoConfirmedTrue,
      lgpdConsent,
      hasLiabilityInsurance,
      attendsPresencial,
      attendsRemoto,
      raioAtendimentoKm,
      address,
      password,
    } = this.form.getRawValue();

    const modalidadeAtendimento =
      attendsPresencial && attendsRemoto ? 'AMBOS' : attendsPresencial ? 'PRESENCIAL' : 'REMOTO';

    this.authService
      .registerProfessional({
        name,
        email,
        phone,
        cpf,
        cnpj: cnpj || undefined,
        category: category as ProfessionalCategory,
        specialtyIds,
        registrationNumber: this.requiresRegistration ? registrationNumber : undefined,
        birthDate,
        gender: gender as ProfessionalRegistration['gender'],
        emergencyContacts,
        infoConfirmedTrue,
        lgpdConsent,
        hasLiabilityInsurance,
        password,
        modalidadeAtendimento,
        raioAtendimentoKm: attendsPresencial ? raioAtendimentoKm : undefined,
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
          this.router.navigateByUrl('/professional');
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);
          this.toastService.error(error.message);
        },
      });
  }
}
