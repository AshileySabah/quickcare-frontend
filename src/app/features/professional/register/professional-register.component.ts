import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import {
  cnpjValidator,
  cpfValidator,
  identityDocumentValidator,
  normalizeIdentityNumber,
} from '../../../core/forms/document-validators';
import { passwordsMatchValidator, strongPasswordValidator } from '../../../core/forms/password-validators';
import { AuthService, ProfessionalProfileInput } from '../../../core/auth/auth.service';
import { EmergencyContactGroup } from '../../../core/forms/emergency-contact-form';
import { addressFieldErrorsFor, buildAddressGroup, toAddress } from '../../../core/forms/address-form';
import {
  confirmPasswordError,
  disableAccountFields,
  missingDocumentMessage,
  prefillFromOtherProfile,
  profileFieldErrorsFor,
} from '../../../core/forms/profile-form';
import {
  atLeastOneModalityValidator,
  modalityError,
  requireRadiusWhenPresencial,
  toAttendanceModality,
} from '../../../core/forms/attendance-modality';
import {
  DocumentType,
  Gender,
  IdentityDocumentType,
  ProfessionalCategory,
  ProfessionalCategoryInfo,
  Specialty,
  User,
} from '../../../core/models';
import { ProfileService } from '../../../core/services/profile.service';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { UfService } from '../../../core/services/uf.service';
import { AddressCardComponent } from '../../../shared/ui/register/address-card/address-card.component';
import { AvatarUploadComponent } from '../../../shared/ui/forms/avatar-upload/avatar-upload.component';
import { BasicInfoCardComponent } from '../../../shared/ui/register/basic-info-card/basic-info-card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../shared/ui/forms/checkbox/checkbox.component';
import { DeclarationsCardComponent } from '../../../shared/ui/register/declarations-card/declarations-card.component';
import { UploadedDocument } from '../../../shared/ui/forms/document-uploader/document-uploader.component';
import { DocumentsCardComponent } from '../../../shared/ui/register/documents-card/documents-card.component';
import { EmergencyContactsCardComponent } from '../../../shared/ui/register/emergency-contacts-card/emergency-contacts-card.component';
import { MultiSelectOption } from '../../../shared/ui/forms/multi-select/multi-select.component';
import { PasswordCardComponent } from '../../../shared/ui/register/password-card/password-card.component';
import { ProfessionalPracticeCardComponent } from './professional-practice-card/professional-practice-card.component';
import { SelectOption } from '../../../shared/ui/forms/select/select.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

@Component({
  selector: 'app-professional-register',
  standalone: true,
  imports: [InvalidFieldFocusDirective, AuthLayoutComponent, 
    ReactiveFormsModule,
    RouterLink,
    AddressCardComponent,
    AvatarUploadComponent,
    BasicInfoCardComponent,
    ButtonComponent,
    CheckboxComponent,
    DeclarationsCardComponent,
    DocumentsCardComponent,
    EmergencyContactsCardComponent,
    PasswordCardComponent,
    ProfessionalPracticeCardComponent,
  ],
  templateUrl: './professional-register.component.html',
})
export class ProfessionalRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly ufService = inject(UfService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly profileService = inject(ProfileService);

  protected readonly isNewProfile = inject(ActivatedRoute).snapshot.data['newProfileRole'] === 'professional';

  protected readonly isSubmitting = signal(false);
  protected readonly avatarBlob = signal<Blob | null>(null);

  protected onAvatarChange(blob: Blob | null): void {
    this.avatarBlob.set(blob);
  }

  protected readonly categoryOptions = signal<ProfessionalCategoryInfo[]>([]);
  protected readonly ufOptions = signal<SelectOption[]>([]);

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
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/), cpfValidator()]],
      identityDocumentType: ['', [Validators.required]],
      identityDocumentNumber: ['', [Validators.required]],
      identityDocumentUf: [''],
      cnpj: ['', [Validators.pattern(/^\d{14}$/), cnpjValidator()]],
      category: this.fb.nonNullable.control<ProfessionalCategory | ''>('', Validators.required),
      specialtyIds: this.fb.nonNullable.control<string[]>([], Validators.required),
      specialtySingle: [''],
      registrationNumber: [''],
      registrationUf: ['', [Validators.pattern(/^[A-Za-z]{2}$/)]],
      birthDate: ['', Validators.required],
      gender: ['', Validators.required],
      emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
      infoConfirmedTrue: [false, Validators.requiredTrue],
      lgpdConsent: [false, Validators.requiredTrue],
      hasLiabilityInsurance: [false],
      attendsPresencial: [false],
      attendsRemoto: [false],
      raioAtendimentoKm: [10, [Validators.min(1)]],
      address: buildAddressGroup(this.fb),
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', Validators.required],
    },
    { validators: [passwordsMatchValidator(), atLeastOneModalityValidator(), identityDocumentValidator()] },
  );

  protected readonly fieldError = profileFieldErrorsFor(this.form);
  protected readonly addressFieldError = addressFieldErrorsFor(this.form.controls.address);

  constructor() {
    requireRadiusWhenPresencial(this.form.controls.attendsPresencial, this.form.controls.raioAtendimentoKm);

    this.form.controls.category.valueChanges.subscribe((category) => {
      this.selectedCategory.set(category);
      this.form.controls.specialtyIds.setValue([]);
      this.form.controls.specialtySingle.setValue('');

      const registrationControl = this.form.controls.registrationNumber;
      const registrationUfControl = this.form.controls.registrationUf;
      if (category === 'CUIDADOR' || category === '') {
        registrationControl.clearValidators();
        registrationUfControl.setValidators([Validators.pattern(/^[A-Za-z]{2}$/)]);
      } else {
        registrationControl.setValidators([Validators.required, Validators.maxLength(50)]);
        registrationUfControl.setValidators([Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]);
      }
      registrationControl.updateValueAndValidity();
      registrationUfControl.updateValueAndValidity();
    });

    this.form.controls.specialtySingle.valueChanges.subscribe((specialtyId) => {
      if (this.form.controls.category.value === 'OUTRO') {
        this.form.controls.specialtyIds.setValue(specialtyId ? [specialtyId] : []);
      }
    });

    this.form.controls.cnpj.valueChanges.subscribe((value) => this.hasCnpj.set(!!value));

    if (this.isNewProfile) {
      disableAccountFields(this.form);
      this.profileService.getPatientProfile().subscribe({
        next: (profile) => prefillFromOtherProfile(this.form, this.fb, profile),
        error: () => this.toastService.error('Não foi possível trazer os dados do seu perfil de paciente.'),
      });
    }
  }

  ngOnInit(): void {
    this.specialtyService.list().subscribe({
      next: (specialties) => this.specialties.set(specialties),
      error: () =>
        this.toastService.error('Não foi possível carregar as especialidades. Recarregue a página e tente novamente.'),
    });

    this.specialtyService.listCategories().subscribe({
      next: (categories) => this.categoryOptions.set(categories),
      error: () =>
        this.toastService.error('Não foi possível carregar as categorias profissionais. Recarregue a página e tente novamente.'),
    });

    this.ufService.list().subscribe({
      next: (ufs) => this.ufOptions.set(ufs),
      error: () => this.toastService.error('Não foi possível carregar as UFs. Recarregue a página e tente novamente.'),
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
    return modalityError(this.form);
  }

  protected get passwordError(): string | null {
    return this.fieldError('password');
  }

  protected get confirmPasswordError(): string | null {
    return confirmPasswordError(this.form);
  }

  protected submit(): void {
    const documents = this.documents();
    const requiredDocuments: DocumentType[] = ['VALIDACAO_CPF'];
    if (this.requiresCnpjDocument) {
      requiredDocuments.push('VALIDACAO_CNPJ');
    }
    if (this.requiresRegistration) {
      requiredDocuments.push('REGISTRO_PROFISSIONAL');
    }
    const missingDocument = missingDocumentMessage(documents, requiredDocuments);
    this.documentsError.set(missingDocument);

    if (this.form.invalid || missingDocument) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const {
      name,
      email,
      phone,
      cpf,
      identityDocumentType,
      identityDocumentNumber,
      identityDocumentUf,
      cnpj,
      category,
      specialtyIds,
      registrationNumber,
      registrationUf,
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

    const profile: ProfessionalProfileInput = {
      cnpj: cnpj || undefined,
      category: category as ProfessionalCategory,
      specialtyIds,
      registrationNumber: this.requiresRegistration ? registrationNumber : undefined,
      registrationUf: this.requiresRegistration ? registrationUf : undefined,
      birthDate,
      gender: gender as Gender,
      emergencyContacts,
      infoConfirmedTrue,
      lgpdConsent,
      hasLiabilityInsurance,
      modalidadeAtendimento: toAttendanceModality(attendsPresencial, attendsRemoto),
      raioAtendimentoKm: attendsPresencial ? raioAtendimentoKm : undefined,
      address: toAddress(address),
      documents: documents.map((document) => ({ file: document.file, type: document.type as DocumentType })),
    };

    const request$: Observable<User> = this.isNewProfile
      ? this.authService.createProfessionalProfile(profile)
      : this.authService.registerProfessional({
          ...profile,
          name,
          email,
          phone,
          cpf,
          identityDocumentType: identityDocumentType as IdentityDocumentType,
          identityDocumentNumber: normalizeIdentityNumber(identityDocumentNumber),
          identityDocumentUf: identityDocumentUf || undefined,
          password,
          avatar: this.avatarBlob() ?? undefined,
        });

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(
          this.isNewProfile
            ? 'Perfil de profissional criado! Ele passa pela validação do cadastro.'
            : 'Cadastro realizado com sucesso!',
        );
        this.router.navigateByUrl('/professional');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
