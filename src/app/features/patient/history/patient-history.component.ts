import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { ServiceRequest } from '../../../core/models';
import { SPECIALTIES_MOCK } from '../../../mocks';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [DatePipe, RouterLink, CardComponent, EmptyStateComponent, ErrorStateComponent, SkeletonComponent, StatusBadgeComponent],
  templateUrl: './patient-history.component.html',
  styleUrl: './patient-history.component.scss',
})
export class PatientHistoryComponent {
  private readonly authService = inject(AuthService);
  private readonly requestService = inject(RequestService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);

  constructor() {
    this.load();
  }

  protected load(): void {
    const patientId = this.authService.currentUser()?.id;

    if (!patientId) {
      return;
    }

    this.viewState.set('loading');

    this.requestService.list({ patientId }).subscribe({
      next: (requests) => {
        const sorted = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        this.requests.set(sorted);
        this.viewState.set(sorted.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected specialtyName(specialtyId: string): string {
    return SPECIALTIES_MOCK.find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId;
  }
}
