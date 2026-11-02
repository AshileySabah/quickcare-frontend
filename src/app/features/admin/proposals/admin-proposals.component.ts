import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { formatPeriod } from '../../../core/formatting/period';
import {
  ADMIN_PROPOSAL_ACTION_LABELS,
  ATTENDANCE_STATUS_LABELS,
  AdminProposalAction,
  AdminProposalSummary,
  ListViewState,
  PROPOSAL_STATUS_LABELS,
  ProposalStatus,
} from '../../../core/models';
import { AdminProposalService } from '../../../core/services/admin/admin-proposal.service';
import { ButtonGroupComponent } from '../../../shared/ui/button-group/button-group.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { createPagination } from '../../../core/lists/pagination';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';

const STATUS_FILTERS: FilterChip<ProposalStatus | null>[] = [
  { value: null, label: 'Todas' },
  ...(Object.entries(PROPOSAL_STATUS_LABELS) as [ProposalStatus, string][]).map(([value, label]) => ({ value, label })),
];

/** O que cada ação faz, para o modal de confirmação. */
const ACTION_CONSEQUENCES: Record<AdminProposalAction, string[]> = {
  recusar: ['A proposta sai do páreo, sem ocorrência para ninguém.', 'O paciente e o profissional recebem a justificativa.'],
  cancelar: [
    'O atendimento em curso é cancelado, sem ocorrência para ninguém.',
    'A vaga volta a receber propostas.',
    'O paciente e o profissional recebem a justificativa.',
  ],
  reativar: [
    'A proposta volta a aguardar a resposta do paciente.',
    'O paciente e o profissional recebem a justificativa.',
  ],
};

/**
 * Gerais › Propostas: todas as propostas, para o admin recusar a pendente,
 * cancelar a aceita ou reativar a recusada/cancelada, com justificativa.
 */
@Component({
  selector: 'app-admin-proposals',
  standalone: true,
  imports: [PaginatorComponent, 
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    ButtonGroupComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FilterChipsComponent,
    InputComponent,
    JustificationDialogComponent,
    SkeletonListComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './admin-proposals.component.html',
  styleUrl: './admin-proposals.component.scss',
})
export class AdminProposalsComponent {
  private readonly proposalService = inject(AdminProposalService);
  private readonly toastService = inject(ToastService);

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly actionLabels = ADMIN_PROPOSAL_ACTION_LABELS;
  protected readonly attendanceLabels = ATTENDANCE_STATUS_LABELS;
  protected readonly status = signal<ProposalStatus | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly proposals = signal<AdminProposalSummary[]>([]);
  /** A lista vem paginada (5 por página por padrão). */
  protected readonly pager = createPagination(this.proposals);

  protected readonly pending = signal<{ proposal: AdminProposalSummary; action: AdminProposalAction } | null>(null);
  protected readonly saving = signal(false);

  protected readonly dialogTexts = computed(() => {
    const pending = this.pending();
    if (!pending) {
      return null;
    }
    const label = this.actionLabels[pending.action].toLowerCase();
    return {
      title: `${this.actionLabels[pending.action]} proposta`,
      message: `${this.actionLabels[pending.action]} a proposta #${pending.proposal.id} de ${pending.proposal.professional.name}?`,
      consequences: ACTION_CONSEQUENCES[pending.action],
      confirm: `Sim, ${label} a proposta`,
      cancel: 'Não, manter a proposta',
      variant: pending.action === 'reativar' ? ('primary' as const) : ('danger' as const),
    };
  });

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load());
    this.load();
  }

  protected selectStatus(status: ProposalStatus | null): void {
    this.status.set(status);
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.proposalService.list({ status: this.status() ?? undefined, search: this.search.value }).subscribe({
      next: (proposals) => {
        this.proposals.set(proposals);
        this.viewState.set(proposals.length ? 'filled' : 'empty');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected period(proposal: AdminProposalSummary): string {
    return formatPeriod(proposal.start, proposal.end);
  }

  protected confirm(justification: string): void {
    const pending = this.pending();
    if (!pending) {
      return;
    }
    this.saving.set(true);
    this.proposalService.changeStatus(pending.proposal.id, pending.action, justification).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.pending.set(null);
        this.proposals.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.toastService.success(`Proposta #${updated.id} atualizada.`);
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected closeDialog(): void {
    if (!this.saving()) {
      this.pending.set(null);
    }
  }
}
