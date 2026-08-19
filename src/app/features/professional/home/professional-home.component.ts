import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { Professional, ServiceRequest } from '../../../core/models';
import { SPECIALTIES_MOCK } from '../../../mocks';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

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

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);

  protected readonly specialtyName = computed(() => {
    const professional = this.authService.currentUser() as Professional | null;
    return SPECIALTIES_MOCK.find((specialty) => specialty.id === professional?.specialtyId)?.name ?? '';
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    const professional = this.authService.currentUser() as Professional | null;

    if (!professional) {
      return;
    }

    this.viewState.set('loading');

    this.requestService.listOpenForSpecialty(professional.specialtyId).subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.viewState.set(requests.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }
}
