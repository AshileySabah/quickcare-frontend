import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EmergencyContactGroup, setEmergencyContacts } from '../../../core/forms/emergency-contact-form';
import { PatientPublicProfile } from '../../../core/models';
import { PublicProfileService } from '../../../core/services/public-profile.service';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { ProfileCardComponent, ProfileDetail } from '../../../shared/ui/profile-card/profile-card.component';
import { EmergencyContactsCardComponent } from '../../../shared/ui/register/emergency-contacts-card/emergency-contacts-card.component';
import { HealthInfoCardComponent } from '../../../shared/ui/register/health-info-card/health-info-card.component';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ProfileBlockActionComponent } from '../../user-blocks/profile-block-action/profile-block-action.component';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [BackLinkComponent, ProfileBlockActionComponent,
    CardComponent,
    EmergencyContactsCardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    HealthInfoCardComponent,
    ProfileCardComponent,
    SkeletonListComponent,
  ],
  templateUrl: './patient-profile.component.html',
  styleUrl: '../public-profile.scss',
})
export class PatientProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly publicProfileService = inject(PublicProfileService);
  private readonly locale = inject(LOCALE_ID);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly profile = signal<PatientPublicProfile | null>(null);

  protected readonly healthForm = this.fb.nonNullable.group({
    allergies: [''],
    healthConditions: [''],
    medicationsInUse: [''],
    emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
  });

  protected readonly details = computed<ProfileDetail[]>(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    return [
      { label: 'Idade', value: `${profile.age} anos` },
      { label: 'Localização', value: `${profile.city}/${profile.state}` },
      { label: 'Membro desde', value: formatDate(profile.memberSince, "MMMM 'de' y", this.locale) },
    ];
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.pageState.set('loading');
    this.publicProfileService.getPatient(this.id).subscribe({
      next: (profile) => {
        if (profile) {
          this.fillHealth(profile);
        }
        this.profile.set(profile ?? null);
        this.pageState.set(profile ? 'filled' : 'not-found');
      },
      error: () => this.pageState.set('error'),
    });
  }

  private fillHealth(profile: PatientPublicProfile): void {
    setEmergencyContacts(this.healthForm, this.fb, profile.emergencyContacts ?? []);
    this.healthForm.patchValue({
      allergies: profile.health?.allergies ?? '',
      healthConditions: profile.health?.healthConditions ?? '',
      medicationsInUse: profile.health?.medicationsInUse ?? '',
    });
  }
}
