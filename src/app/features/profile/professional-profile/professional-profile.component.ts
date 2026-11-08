import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EmergencyContactGroup, setEmergencyContacts } from '../../../core/forms/emergency-contact-form';
import { ATTENDANCE_MODALITY_LABELS, ProfessionalPublicProfile } from '../../../core/models';
import { PublicProfileService } from '../../../core/services/public-profile.service';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ProfileCardComponent, ProfileDetail } from '../../../shared/ui/profile-card/profile-card.component';
import { EmergencyContactsCardComponent } from '../../../shared/ui/register/emergency-contacts-card/emergency-contacts-card.component';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ProfileBlockActionComponent } from '../../user-blocks/profile-block-action/profile-block-action.component';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

@Component({
  selector: 'app-professional-profile',
  standalone: true,
  imports: [BackLinkComponent, ProfileBlockActionComponent, EmergencyContactsCardComponent, EmptyStateComponent, ErrorStateComponent, ProfileCardComponent, SkeletonListComponent],
  templateUrl: './professional-profile.component.html',
  styleUrl: '../public-profile.scss',
})
export class ProfessionalProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly publicProfileService = inject(PublicProfileService);
  private readonly locale = inject(LOCALE_ID);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly profile = signal<ProfessionalPublicProfile | null>(null);

  protected readonly contactsForm = this.fb.nonNullable.group({
    emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
  });

  protected readonly subtitle = computed(
    () => this.profile()?.practiceAreas.map((area) => area.label).join(' · ') ?? '',
  );

  protected readonly details = computed<ProfileDetail[]>(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    const details: ProfileDetail[] = profile.practiceAreas.flatMap((area) => {
      const especialidades = area.specialties.map((specialty) => specialty.name).join(', ');
      const registro =
        area.registrationLabel && area.registrationNumber
          ? ` · ${area.registrationLabel} ${area.registrationNumber}/${area.registrationUf}`
          : '';
      return [{ label: area.label, value: `${especialidades}${registro}` }];
    });
    details.push(
      { label: 'Atendimento', value: ATTENDANCE_MODALITY_LABELS[profile.attendanceModality] },
      { label: 'Localização', value: `${profile.city}/${profile.state}` },
      { label: 'Membro desde', value: formatDate(profile.memberSince, "MMMM 'de' y", this.locale) },
      { label: 'Atendimentos concluídos', value: String(profile.completedServices) },
    );
    return details;
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.pageState.set('loading');
    this.publicProfileService.getProfessional(this.id).subscribe({
      next: (profile) => {
        if (profile?.emergencyContacts) {
          setEmergencyContacts(this.contactsForm, this.fb, profile.emergencyContacts);
        }
        this.profile.set(profile ?? null);
        this.pageState.set(profile ? 'filled' : 'not-found');
      },
      error: () => this.pageState.set('error'),
    });
  }
}
