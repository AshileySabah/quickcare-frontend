import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmergencyContactGroup, buildEmergencyContactGroup } from '../../../core/forms/emergency-contact-form';
import { Gender } from '../../../core/models';
import { PatientProfile, ProfileService } from '../../../core/services/profile.service';
import { AddressCardComponent } from '../../../shared/ui/register/address-card/address-card.component';
import { AvatarUploadComponent } from '../../../shared/ui/forms/avatar-upload/avatar-upload.component';
import { BasicInfoCardComponent } from '../../../shared/ui/register/basic-info-card/basic-info-card.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmergencyContactsCardComponent } from '../../../shared/ui/register/emergency-contacts-card/emergency-contacts-card.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { HealthInfoCardComponent } from '../register/health-info-card/health-info-card.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

type PageState = 'loading' | 'error' | 'ready';
type FieldName = 'name' | 'phone' | 'birthDate' | 'gender';
type AddressFieldName = 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state';

@Component({
  selector: 'app-patient-edit-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AddressCardComponent,
    AvatarUploadComponent,
    BasicInfoCardComponent,
    ButtonComponent,
    EmergencyContactsCardComponent,
    ErrorStateComponent,
    HealthInfoCardComponent,
    SkeletonComponent,
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

  private avatarBlob: Blob | null = null;
  private avatarRemoved = false;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    birthDate: ['', [Validators.required]],
    gender: ['', [Validators.required]],
    emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
    allergies: [''],
    healthConditions: [''],
    medicationsInUse: [''],
    address: this.fb.nonNullable.group({
      cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      street: ['', Validators.required],
      number: ['', Validators.required],
      complement: [''],
      neighborhood: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    }),
  });

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

  protected fieldError = (fieldName: string): string | null => {
    const control = this.form.controls[fieldName as FieldName];

    if (!control || !control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
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
        birthDate: value.birthDate,
        gender: value.gender as Gender,
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
    const contacts = this.form.controls.emergencyContacts;
    contacts.clear();
    profile.emergencyContacts.forEach(() => contacts.push(buildEmergencyContactGroup(this.fb)));

    this.form.reset({
      name: profile.name,
      phone: profile.phone,
      birthDate: profile.birthDate,
      gender: profile.gender,
      emergencyContacts: profile.emergencyContacts,
      allergies: profile.allergies,
      healthConditions: profile.healthConditions,
      medicationsInUse: profile.medicationsInUse,
      address: profile.address,
    });

    this.avatarUrl.set(profile.avatarUrl);
  }
}
