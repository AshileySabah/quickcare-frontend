import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RequestService } from '../../../core/services/request.service';
import { ServiceRequest, requestedProfessionalsSummary } from '../../../core/models';
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
  private readonly requestService = inject(RequestService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);

  protected readonly professionalsSummary = requestedProfessionalsSummary;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.requestService.listAvailable().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.viewState.set(requests.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }
}
