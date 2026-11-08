import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ATTENDANCE_MODALITY_LABELS, ProfessionalPublicProfile } from '../../../core/models';
import { PublicSearchService } from '../../../core/services/public-search.service';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ProfileCardComponent, ProfileDetail } from '../../../shared/ui/profile-card/profile-card.component';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

@Component({
  selector: 'app-public-professional-profile',
  standalone: true,
  imports: [RouterLink, BackLinkComponent, ButtonComponent, EmptyStateComponent, ErrorStateComponent, ProfileCardComponent, SkeletonListComponent],
  templateUrl: './public-professional-profile.component.html',
})
export class PublicProfessionalProfileComponent {
  private readonly searchService = inject(PublicSearchService);
  private readonly locale = inject(LOCALE_ID);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly user = inject(AuthService).currentUser;

  protected readonly pageState = signal<PageState>('loading');
  protected readonly profile = signal<ProfessionalPublicProfile | null>(null);

  protected readonly callToAction = computed(() => {
    const user = this.user();
    if (!user) {
      return { label: 'Quero ser atendido', link: '/cadastro/paciente' };
    }
    return user.role === 'patient' ? { label: 'Criar uma solicitação', link: '/patient/novo' } : null;
  });

  protected readonly subtitle = computed(
    () => this.profile()?.practiceAreas.map((area) => area.label).join(' · ') ?? '',
  );

  protected readonly details = computed<ProfileDetail[]>(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }
    const details: ProfileDetail[] = profile.practiceAreas.map((area) => {
      const especialidades = area.specialties.map((specialty) => specialty.name).join(', ');
      const registro =
        area.registrationLabel && area.registrationNumber
          ? ` · ${area.registrationLabel} ${area.registrationNumber}/${area.registrationUf}`
          : '';
      return { label: area.label, value: `${especialidades}${registro}` };
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
    this.searchService.professional(this.id).subscribe({
      next: (profile) => {
        this.profile.set(profile ?? null);
        this.pageState.set(profile ? 'filled' : 'not-found');
      },
      error: () => this.pageState.set('error'),
    });
  }
}
