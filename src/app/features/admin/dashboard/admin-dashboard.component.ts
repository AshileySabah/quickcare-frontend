import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Professional } from '../../../core/models';
import { SPECIALTIES_MOCK } from '../../../mocks';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';

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

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly pendingProfessionals = signal<Professional[]>([]);

  constructor() {
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

  protected specialtyName(specialtyId: string): string {
    return SPECIALTIES_MOCK.find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId;
  }
}
