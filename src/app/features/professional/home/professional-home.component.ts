import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { Professional, ServiceRequest, Specialty } from '../../../core/models';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

@Component({
  selector: 'app-professional-home',
  standalone: true,
  imports: [DatePipe, RouterLink, CardComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './professional-home.component.html',
  styleUrl: './professional-home.component.scss',
})
export class ProfessionalHomeComponent {
  private readonly authService = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly specialtyService = inject(SpecialtyService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);
  private readonly specialties = signal<Specialty[]>([]);

  protected readonly specialtyName = computed(() => {
    const professional = this.authService.currentUser() as Professional | null;
    const specialtyIds = professional?.specialtyIds ?? [];
    const names = this.specialties()
      .filter((specialty) => specialtyIds.includes(specialty.id))
      .map((specialty) => specialty.name);
    return names.join(', ');
  });

  constructor() {
    this.specialtyService.list().subscribe((specialties) => this.specialties.set(specialties));
    this.load();
  }

  protected load(): void {
    const professional = this.authService.currentUser() as Professional | null;

    if (!professional) {
      return;
    }

    this.viewState.set('loading');

    const specialtyIds = professional.specialtyIds;

    this.requestService.listOpenForSpecialties(specialtyIds).subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.viewState.set(requests.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }
}
