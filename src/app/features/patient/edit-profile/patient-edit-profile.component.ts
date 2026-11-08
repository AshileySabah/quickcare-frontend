import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addressFieldErrorsFor, buildAddressGroup } from '../../../core/forms/address-form';
import { EmergencyContactGroup, setEmergencyContacts } from '../../../core/forms/emergency-contact-form';
import { LOCKED_PROFILE_NOTE, lockedDeclarationControls, profileFieldErrorsFor } from '../../../core/forms/profile-form';
import { PatientProfile, ProfileService } from '../../../core/services/profile.service';
import { AddressCardComponent } from '../../../shared/ui/register/address-card/address-card.component';
import { AvatarUploadComponent } from '../../../shared/ui/forms/avatar-upload/avatar-upload.component';
import { BasicInfoCardComponent } from '../../../shared/ui/register/basic-info-card/basic-info-card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { DeclarationsCardComponent } from '../../../shared/ui/register/declarations-card/declarations-card.component';
import { EmergencyContactsCardComponent } from '../../../shared/ui/register/emergency-contacts-card/emergency-contacts-card.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { HealthInfoCardComponent } from '../../../shared/ui/register/health-info-card/health-info-card.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

type PageState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'app-patient-edit-profile',
  standalone: true,
  imports: [
    InvalidFieldFocusDirective,
    SkeletonListComponent,
    ReactiveFormsModule,
    AddressCardComponent,
    AvatarUploadComponent,
    BasicInfoCardComponent,
    ButtonComponent,
    DeclarationsCardComponent,
    EmergencyContactsCardComponent,
    ErrorStateComponent,
    HealthInfoCardComponent,
  ],
  templateUrl: './patient-edit-profile.component.html',
  styleUrl: './patient-edit-profile.component.scss',
})
export class PatientEditProfileComponent implements OnInit {
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

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
    allergies: [''],
    healthConditions: [''],
    medicationsInUse: [''],
    address: buildAddressGroup(this.fb),
    ...lockedDeclarationControls(this.fb),
  });

  protected readonly fieldError = profileFieldErrorsFor(this.form);
  protected readonly addressFieldError = addressFieldErrorsFor(this.form.controls.address);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.profileService.getPatientProfile().subscribe({
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

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const value = this.form.getRawValue();

    this.profileService
      .updatePatientProfile({
        name: value.name,
        phone: value.phone,
        emergencyContacts: value.emergencyContacts,
        allergies: value.allergies,
        healthConditions: value.healthConditions,
        medicationsInUse: value.medicationsInUse,
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

  private fillForm(profile: PatientProfile): void {
    setEmergencyContacts(this.form, this.fb, profile.emergencyContacts);
    this.form.reset({
      name: profile.name,
      phone: profile.phone,
      emergencyContacts: profile.emergencyContacts,
      allergies: profile.allergies,
      healthConditions: profile.healthConditions,
      medicationsInUse: profile.medicationsInUse,
      address: profile.address,
      ...profile.declarations,
    });

    this.avatarUrl.set(profile.avatarUrl);
  }
}
