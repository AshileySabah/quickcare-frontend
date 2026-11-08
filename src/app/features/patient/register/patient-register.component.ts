import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { cpfValidator, identityDocumentValidator, normalizeIdentityNumber } from '../../../core/forms/document-validators';
import { passwordsMatchValidator, strongPasswordValidator } from '../../../core/forms/password-validators';
import { AuthService, PatientProfileInput } from '../../../core/auth/auth.service';
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
import { DocumentType, Gender, IdentityDocumentType, User } from '../../../core/models';
import { ProfileService } from '../../../core/services/profile.service';
import { UfService } from '../../../core/services/uf.service';
import { EmergencyContactGroup } from '../../../core/forms/emergency-contact-form';
import { AddressCardComponent } from '../../../shared/ui/register/address-card/address-card.component';
import { AvatarUploadComponent } from '../../../shared/ui/forms/avatar-upload/avatar-upload.component';
import { BasicInfoCardComponent } from '../../../shared/ui/register/basic-info-card/basic-info-card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { DeclarationsCardComponent } from '../../../shared/ui/register/declarations-card/declarations-card.component';
import { DocumentsCardComponent } from '../../../shared/ui/register/documents-card/documents-card.component';
import { UploadedDocument } from '../../../shared/ui/forms/document-uploader/document-uploader.component';
import { EmergencyContactsCardComponent } from '../../../shared/ui/register/emergency-contacts-card/emergency-contacts-card.component';
import { HealthInfoCardComponent } from '../../../shared/ui/register/health-info-card/health-info-card.component';
import { PasswordCardComponent } from '../../../shared/ui/register/password-card/password-card.component';
import { SelectOption } from '../../../shared/ui/forms/select/select.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

@Component({
  selector: 'app-patient-register',
  standalone: true,
  imports: [InvalidFieldFocusDirective, AuthLayoutComponent, 
    ReactiveFormsModule,
    RouterLink,
    AddressCardComponent,
    AvatarUploadComponent,
    BasicInfoCardComponent,
    ButtonComponent,
    DeclarationsCardComponent,
    DocumentsCardComponent,
    EmergencyContactsCardComponent,
    HealthInfoCardComponent,
    PasswordCardComponent,
  ],
  templateUrl: './patient-register.component.html',
})
export class PatientRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly ufService = inject(UfService);
  private readonly profileService = inject(ProfileService);

  protected readonly isNewProfile = inject(ActivatedRoute).snapshot.data['newProfileRole'] === 'patient';

  protected readonly isSubmitting = signal(false);
  protected readonly ufOptions = signal<SelectOption[]>([]);
  protected readonly avatarBlob = signal<Blob | null>(null);
  protected readonly documentTypeOptions = PERSONAL_DOCUMENT_OPTIONS;

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
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/), cpfValidator()]],
      identityDocumentType: ['', [Validators.required]],
      identityDocumentNumber: ['', [Validators.required]],
      identityDocumentUf: [''],
      birthDate: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
      allergies: [''],
      healthConditions: [''],
      medicationsInUse: [''],
      infoConfirmedTrue: [false, [Validators.requiredTrue]],
      lgpdConsent: [false, [Validators.requiredTrue]],
      address: buildAddressGroup(this.fb),
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatchValidator(), identityDocumentValidator()] },
  );

  protected readonly fieldError = profileFieldErrorsFor(this.form);
  protected readonly addressFieldError = addressFieldErrorsFor(this.form.controls.address);

  constructor() {
    this.ufService.list().subscribe({
      next: (ufs) => this.ufOptions.set(ufs),
      error: () => this.toastService.error('Não foi possível carregar a lista de estados.'),
    });

    if (this.isNewProfile) {
      disableAccountFields(this.form);
      this.profileService.getProfessionalProfile().subscribe({
        next: (profile) => prefillFromOtherProfile(this.form, this.fb, profile),
        error: () => this.toastService.error('Não foi possível trazer os dados do seu perfil de profissional.'),
      });
    }
  }

  protected get passwordError(): string | null {
    return this.fieldError('password');
  }

  protected get confirmPasswordError(): string | null {
    return confirmPasswordError(this.form);
  }

  protected submit(): void {
    const documents = this.documents();
    const missingDocument = missingDocumentMessage(documents, PERSONAL_DOCUMENT_TYPES);
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

    const profile: PatientProfileInput = {
      birthDate,
      gender: gender as Gender,
      emergencyContacts,
      infoConfirmedTrue,
      lgpdConsent,
      allergies: allergies || undefined,
      healthConditions: healthConditions || undefined,
      medicationsInUse: medicationsInUse || undefined,
      address: toAddress(address),
      documents: documents.map((document) => ({ file: document.file, type: document.type as DocumentType })),
    };

    const request$: Observable<User> = this.isNewProfile
      ? this.authService.createPatientProfile(profile)
      : this.authService.registerPatient({
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
            ? 'Perfil de paciente criado! Ele passa pela validação do cadastro.'
            : 'Cadastro realizado com sucesso!',
        );
        this.router.navigateByUrl('/patient');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
