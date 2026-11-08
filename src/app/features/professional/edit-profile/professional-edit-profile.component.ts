import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addressFieldErrorsFor, buildAddressGroup } from '../../../core/forms/address-form';
import { EmergencyContactGroup, setEmergencyContacts } from '../../../core/forms/emergency-contact-form';
import { LOCKED_PROFILE_NOTE, lockedDeclarationControls, profileFieldErrorsFor } from '../../../core/forms/profile-form';
import {
  atLeastOneModalityValidator,
  fromAttendanceModality,
  modalityError,
  requireRadiusWhenPresencial,
  toAttendanceModality,
} from '../../../core/forms/attendance-modality';
import { ProfessionalProfile, ProfileService } from '../../../core/services/profile.service';
import { AddressCardComponent } from '../../../shared/ui/register/address-card/address-card.component';
import { AvatarUploadComponent } from '../../../shared/ui/forms/avatar-upload/avatar-upload.component';
import { BasicInfoCardComponent } from '../../../shared/ui/register/basic-info-card/basic-info-card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../shared/ui/forms/checkbox/checkbox.component';
import { DeclarationsCardComponent } from '../../../shared/ui/register/declarations-card/declarations-card.component';
import { EmergencyContactsCardComponent } from '../../../shared/ui/register/emergency-contacts-card/emergency-contacts-card.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { ProfessionalPracticeCardComponent } from '../register/professional-practice-card/professional-practice-card.component';
import { PracticeAreasManagerComponent } from '../practice-areas/practice-areas-manager/practice-areas-manager.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

type PageState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'app-professional-edit-profile',
  standalone: true,
  imports: [
    InvalidFieldFocusDirective,
    SkeletonListComponent,
    ReactiveFormsModule,
    AddressCardComponent,
    AvatarUploadComponent,
    BasicInfoCardComponent,
    ButtonComponent,
    CheckboxComponent,
    DeclarationsCardComponent,
    EmergencyContactsCardComponent,
    ErrorStateComponent,
    PracticeAreasManagerComponent,
    ProfessionalPracticeCardComponent,
  ],
  templateUrl: './professional-edit-profile.component.html',
  styleUrl: './professional-edit-profile.component.scss',
})
export class ProfessionalEditProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly toastService = inject(ToastService);

  protected readonly state = signal<PageState>('loading');
  protected readonly loadError = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly lockedNote = LOCKED_PROFILE_NOTE;

  private avatarBlob: Blob | null = null;
  private avatarRemoved = false;

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', Validators.required],
      phone: ['', Validators.required],
      emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
      hasLiabilityInsurance: [false],
      attendsPresencial: [false],
      attendsRemoto: [false],
      raioAtendimentoKm: [10, [Validators.min(1)]],
      address: buildAddressGroup(this.fb),
      ...lockedDeclarationControls(this.fb),
    },
    { validators: atLeastOneModalityValidator() },
  );

  protected readonly fieldError = profileFieldErrorsFor(this.form);
  protected readonly addressFieldError = addressFieldErrorsFor(this.form.controls.address);

  constructor() {
    requireRadiusWhenPresencial(this.form.controls.attendsPresencial, this.form.controls.raioAtendimentoKm);
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.profileService.getProfessionalProfile().subscribe({
      next: (profile) => {
        this.fillForm(profile);
        this.state.set('ready');
      },
      error: (error: Error) => {
        this.loadError.set(error.message);
        this.state.set('error');
      },
    });
  }

  protected onAvatarChange(blob: Blob | null): void {
    this.avatarBlob = blob;
    this.avatarRemoved = blob === null;
  }

  protected get modalityError(): string | null {
    return modalityError(this.form);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const value = this.form.getRawValue();

    this.profileService
      .updateProfessionalProfile({
        name: value.name,
        phone: value.phone,
        emergencyContacts: value.emergencyContacts,
        hasLiabilityInsurance: value.hasLiabilityInsurance,
        modalidadeAtendimento: toAttendanceModality(value.attendsPresencial, value.attendsRemoto),
        raioAtendimentoKm: value.attendsPresencial ? value.raioAtendimentoKm : undefined,
        address: value.address,
        avatar: this.avatarBlob ?? undefined,
        removeAvatar: this.avatarRemoved,
      })
      .subscribe({
        next: ({ message, profile }) => {
          this.isSubmitting.set(false);
          this.avatarBlob = null;
          this.avatarRemoved = false;
          this.fillForm(profile);
          this.toastService.success(message);
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);
          this.toastService.error(error.message);
        },
      });
  }

  private fillForm(profile: ProfessionalProfile): void {
    setEmergencyContacts(this.form, this.fb, profile.emergencyContacts);
    this.form.reset({
      name: profile.name,
      phone: profile.phone,
      emergencyContacts: profile.emergencyContacts,
      hasLiabilityInsurance: profile.hasLiabilityInsurance,
      ...fromAttendanceModality(profile.modalidadeAtendimento),
      raioAtendimentoKm: profile.raioAtendimentoKm ?? 10,
      address: profile.address,
      ...profile.declarations,
    });

    this.avatarUrl.set(profile.avatarUrl);
  }
}
