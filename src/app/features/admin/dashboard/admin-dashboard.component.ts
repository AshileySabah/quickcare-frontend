import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Professional, ProfessionalCategoryInfo, Specialty } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, CardComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly specialtyService = inject(SpecialtyService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly pendingProfessionals = signal<Professional[]>([]);
  private readonly specialties = signal<Specialty[]>([]);
  private readonly categories = signal<ProfessionalCategoryInfo[]>([]);

  constructor() {
    this.specialtyService.list().subscribe((specialties) => this.specialties.set(specialties));
    this.specialtyService.listCategories().subscribe((categories) => this.categories.set(categories));
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.authService.listPendingProfessionals().subscribe({
      next: (professionals) => {
        this.pendingProfessionals.set(professionals);
        this.viewState.set(professionals.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected specialtyNames(professional: Professional): string {
    return professional.specialtyIds
      .map((specialtyId) => this.specialties().find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId)
      .join(', ');
  }

  protected registrationSummary(professional: Professional): string {
    return professional.registrationNumber
      ? `${this.registrationLabel(professional)}: ${professional.registrationNumber}`
      : 'Sem registro profissional';
  }

  protected categoryLabel(professional: Professional): string {
    return this.categories().find((category) => category.value === professional.category)?.label ?? professional.category;
  }

  private registrationLabel(professional: Professional): string {
    return (
      this.categories().find((category) => category.value === professional.category)?.registrationLabel ??
      'Registro profissional'
    );
  }
}
