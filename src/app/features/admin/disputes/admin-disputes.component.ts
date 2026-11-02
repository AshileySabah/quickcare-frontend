import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatPeriod } from '../../../core/formatting/period';
import { DisputeSummary, ListViewState, ProblemStatus } from '../../../core/models';
import { AdminDisputeService } from '../../../core/services/admin/admin-dispute.service';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';

type DisputeFilter = 'em_disputa' | 'aguardando' | 'encerrados' | 'todos';

const FILTERS: FilterChip<DisputeFilter>[] = [
  { value: 'em_disputa', label: 'Em disputa' },
  { value: 'aguardando', label: 'Aguardando resposta' },
  { value: 'encerrados', label: 'Encerrados' },
  { value: 'todos', label: 'Todos' },
];

const STATUS_BY_FILTER: Record<DisputeFilter, ProblemStatus[]> = {
  em_disputa: ['em_disputa'],
  aguardando: ['aguardando_resposta'],
  encerrados: ['confirmado', 'sem_resposta', 'decidido'],
  todos: [],
};

/** Relatos de "não foi realizado": os contestados esperam a decisão do admin. */
@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FilterChipsComponent,
    SkeletonListComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './admin-disputes.component.html',
  styleUrl: './admin-disputes.component.scss',
})
export class AdminDisputesComponent {
  private readonly disputeService = inject(AdminDisputeService);

  protected readonly filters = FILTERS;
  protected readonly selected = signal<DisputeFilter>('em_disputa');
  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly disputes = signal<DisputeSummary[]>([]);
  protected readonly period = formatPeriod;

  constructor() {
    this.load();
  }

  protected select(filter: DisputeFilter): void {
    this.selected.set(filter);
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.disputeService.list(STATUS_BY_FILTER[this.selected()]).subscribe({
      next: (disputes) => {
        this.disputes.set(disputes);
        this.viewState.set(disputes.length ? 'filled' : 'empty');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected reporter(dispute: DisputeSummary): string {
    return dispute.reportedBy === 'paciente' ? `Paciente (${dispute.patient.name})` : `Profissional (${dispute.professional.name})`;
  }
}
