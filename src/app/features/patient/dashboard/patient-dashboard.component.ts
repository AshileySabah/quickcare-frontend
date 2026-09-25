import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { ServiceRequest, Specialty } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.scss',
})
export class PatientDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly specialtyService = inject(SpecialtyService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly activeRequests = signal<ServiceRequest[]>([]);
  private readonly specialties = signal<Specialty[]>([]);

  constructor() {
    this.specialtyService.list().subscribe((specialties) => this.specialties.set(specialties));
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
        const active = requests.filter((request) => request.status !== 'concluida' && request.status !== 'cancelada');
        this.activeRequests.set(active);
        this.viewState.set(active.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected specialtyName(specialtyId: string): string {
    return this.specialties().find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId;
  }
}
