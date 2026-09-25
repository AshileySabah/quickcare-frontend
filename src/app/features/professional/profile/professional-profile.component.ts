import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { Professional, ProfessionalCategoryInfo, Specialty } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { VerifiedBadgeComponent } from '../../../shared/ui/feedback/verified-badge/verified-badge.component';

@Component({
  selector: 'app-professional-profile',
  standalone: true,
  imports: [CardComponent, VerifiedBadgeComponent],
  templateUrl: './professional-profile.component.html',
  styleUrl: './professional-profile.component.scss',
})
export class ProfessionalProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly specialtyService = inject(SpecialtyService);

  protected readonly professional = computed(() => this.authService.currentUser() as Professional | null);

  private readonly specialties = signal<Specialty[]>([]);
  private readonly categories = signal<ProfessionalCategoryInfo[]>([]);

  constructor() {
    this.specialtyService.list().subscribe((specialties) => this.specialties.set(specialties));
    this.specialtyService.listCategories().subscribe((categories) => this.categories.set(categories));
  }

  protected specialtyName(specialtyId: string): string {
    return this.specialties().find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId;
  }

  protected categoryLabel(professional: Professional): string {
    return this.categories().find((category) => category.value === professional.category)?.label ?? professional.category;
  }

  protected registrationLabel(professional: Professional): string {
    return (
      this.categories().find((category) => category.value === professional.category)?.registrationLabel ??
      'Registro profissional'
    );
  }
}
