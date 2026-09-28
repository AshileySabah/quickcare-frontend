import { Component, inject, signal } from '@angular/core';
import { RequestStatus, ServiceRequest } from '../../../core/models';
import { RequestService } from '../../../core/services/request.service';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { RequestCardComponent } from '../request-card/request-card.component';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

/** Solicitações encerradas; as ativas ficam na home. */
const CLOSED_STATUSES: RequestStatus[] = ['concluida', 'cancelada'];

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    GridComponent,
    GridItemComponent,
    RequestCardComponent,
    SkeletonComponent,
  ],
  templateUrl: './patient-history.component.html',
  styleUrl: './patient-history.component.scss',
})
export class PatientHistoryComponent {
  private readonly requestService = inject(RequestService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.requestService.list().subscribe({
      next: (requests) => {
        // O back já devolve das mais recentes para as mais antigas.
        const closed = requests.filter((request) => CLOSED_STATUSES.includes(request.status));
        this.requests.set(closed);
        this.viewState.set(closed.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }
}
