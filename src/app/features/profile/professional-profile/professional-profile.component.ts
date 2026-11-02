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

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

/**
 * Perfil de um profissional, como o paciente vê ao comparar propostas. Só
 * aprovados têm perfil visível; os contatos de emergência aparecem para o
 * paciente cujo atendimento com ele já começou.
 */
@Component({
  selector: 'app-professional-profile',
  standalone: true,
  imports: [BackLinkComponent, EmergencyContactsCardComponent, EmptyStateComponent, ErrorStateComponent, ProfileCardComponent, SkeletonListComponent],
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

  /** Alimenta o card de contatos, que trabalha com formulário. */
  protected readonly contactsForm = this.fb.nonNullable.group({
    emergencyContacts: this.fb.array<EmergencyContactGroup>([]),
  });

  protected readonly details = computed<ProfileDetail[]>(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    const details: ProfileDetail[] = [{ label: 'Especialidades', value: profile.specialties.join(', ') }];
    if (profile.registrationLabel && profile.registrationNumber) {
      details.push({
        label: 'Registro',
        value: `${profile.registrationLabel} ${profile.registrationNumber}/${profile.registrationUf}`,
      });
    }
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
