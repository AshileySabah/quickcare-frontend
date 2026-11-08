import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  PERSONAL_DOCUMENT_OPTIONS,
  PERSONAL_DOCUMENT_TYPES,
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
  PracticeAreaGroup,
  buildPracticeAreaGroup,
  toPracticeAreaInput,
  uniquePracticeAreasValidator,
} from '../../../core/forms/practice-area-form';
import { DocumentType, Gender, IdentityDocumentType, ProfessionalCategoryInfo, Specialty, User } from '../../../core/models';
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
import { PasswordCardComponent } from '../../../shared/ui/register/password-card/password-card.component';
import { ProfessionalPracticeCardComponent } from './professional-practice-card/professional-practice-card.component';
import { PracticeAreasCardComponent } from '../practice-areas/practice-areas-card/practice-areas-card.component';
import { SelectOption } from '../../../shared/ui/forms/select/select.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

function invalidControls(control: AbstractControl, path = 'form'): { caminho: string; status: string; erros: unknown }[] {
  const own = control.errors || control.status === 'PENDING' ? [{ caminho: path, status: control.status, erros: control.errors }] : [];
  if (control instanceof FormGroup || control instanceof FormArray) {
    return [
      ...own,
      ...Object.entries(control.controls).flatMap(([key, child]) => invalidControls(child as AbstractControl, `${path}.${key}`)),
    ];
  }
  return control.invalid ? [{ caminho: path, status: control.status, erros: control.errors }] : own;
}

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
    PracticeAreasCardComponent,
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
  protected readonly specialties = signal<Specialty[]>([]);

  private readonly hasCnpj = signal(false);

  protected readonly documentTypeOptions = computed<SelectOption[]>(() => {
    const options: SelectOption[] = [...PERSONAL_DOCUMENT_OPTIONS];

    if (this.hasCnpj()) {
      options.push({ value: 'VALIDACAO_CNPJ', label: 'CNPJ' });
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
      practiceAreas: this.fb.array<PracticeAreaGroup>([buildPracticeAreaGroup(this.fb)], {
        validators: uniquePracticeAreasValidator(),
      }),
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

  protected get requiresCnpjDocument(): boolean {
    return !!this.form.controls.cnpj.value;
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
    const requiredDocuments: DocumentType[] = [...PERSONAL_DOCUMENT_TYPES];
    if (this.requiresCnpjDocument) {
      requiredDocuments.push('VALIDACAO_CNPJ');
    }
    const missingDocument = missingDocumentMessage(documents, requiredDocuments);
    this.documentsError.set(missingDocument);

    console.log('[cadastro profissional] criar conta', {
      valido: this.form.valid,
      status: this.form.status,
      invalidos: invalidControls(this.form),
      documentoFaltando: missingDocument,
      documentos: documents.map((document) => ({ tipo: document.type, arquivo: document.file?.name })),
      atuacoes: this.form.controls.practiceAreas.controls.map((group) => ({
        ...group.getRawValue(),
        document: group.controls.document.value?.name ?? null,
        status: group.status,
        erros: group.errors,
      })),
      valores: { ...this.form.getRawValue(), password: '***', confirmPassword: '***' },
    });

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
      practiceAreas: this.form.controls.practiceAreas.controls.map(toPracticeAreaInput),
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
