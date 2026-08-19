import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Professional } from '../../../core/models';
import { SPECIALTIES_MOCK } from '../../../mocks';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { VerifiedBadgeComponent } from '../../../shared/ui/verified-badge/verified-badge.component';

@Component({
  selector: 'app-professional-profile',
  standalone: true,
  imports: [CardComponent, VerifiedBadgeComponent],
  templateUrl: './professional-profile.component.html',
  styleUrl: './professional-profile.component.scss',
})
export class ProfessionalProfileComponent {
  private readonly authService = inject(AuthService);

  protected readonly professional = computed(() => this.authService.currentUser() as Professional | null);

  protected specialtyName(specialtyId: string): string {
    return SPECIALTIES_MOCK.find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId;
  }
}
