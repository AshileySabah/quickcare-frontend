import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { createListFilters } from '../../../core/lists/list-filters';
import { PROPOSAL_SORTS, proposalSearchText, proposalStatusFilter } from '../../../core/lists/proposal-filters';
import { modalityFilter } from '../../../core/lists/request-filters';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProposalService, CANCEL_ACCEPTED_PROPOSAL_CONSEQUENCES } from '../../../core/services/proposal.service';
import { ListViewState, Proposal, ProposalStatus, reacceptNotice, requestedProfessionalsSummary, RequestStatus } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ButtonGroupComponent } from '../../../shared/ui/button-group/button-group.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { ProposalCardComponent } from '../../../shared/ui/proposal-card/proposal-card.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EditProposalActionComponent } from '../../../features/professional/edit-proposal-action/edit-proposal-action.component';
import { ListFiltersComponent } from '../../../shared/ui/list-filters/list-filters.component';
import { AttendancePanelComponent } from '../../attendance/attendance-panel/attendance-panel.component';
import { CreationLockService } from '../../../core/services/creation-lock.service';
import { BlockedNoticeComponent } from '../../occurrences/blocked-notice/blocked-notice.component';
import { PersonMenuComponent } from '../../user-blocks/person-menu/person-menu.component';
import { PersonChipComponent } from '../../../shared/ui/person-chip/person-chip.component';

const CLOSED_PROPOSAL_STATUSES: ProposalStatus[] = ['recusada', 'cancelada'];
const CLOSED_REQUEST_STATUSES: RequestStatus[] = ['concluida', 'cancelada'];

function isClosed(proposal: Proposal): boolean {
  return (
    CLOSED_PROPOSAL_STATUSES.includes(proposal.status) || CLOSED_REQUEST_STATUSES.includes(proposal.request.status)
  );
}

@Component({
  selector: 'app-my-proposals',
  standalone: true,
  imports: [BlockedNoticeComponent, PersonMenuComponent, PersonChipComponent, AttendancePanelComponent, ListFiltersComponent, EditProposalActionComponent, ConfirmDialogComponent, IconComponent, SkeletonListComponent, RouterLink, ButtonComponent, ButtonGroupComponent, EmptyStateComponent, ErrorStateComponent, ProposalCardComponent],
  templateUrl: './my-proposals.component.html',
  styleUrl: './my-proposals.component.scss',
})
export class MyProposalsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);
  protected readonly blocked = inject(CreationLockService).lockFor('professional');

  protected readonly patientHiddenNote = 'O nome e a foto do paciente aparecem aqui assim que ele aceitar a sua proposta.';

  protected readonly isHistory = inject(ActivatedRoute).snapshot.data['view'] === 'history';

  protected readonly viewState = signal<ListViewState>('loading');
  private readonly proposals = signal<Proposal[]>([]);
  protected readonly visibleProposals = computed(() =>
    this.proposals().filter((proposal) => isClosed(proposal) === this.isHistory),
  );

  protected readonly filters = createListFilters(this.fb, this.visibleProposals, {
    searchPlaceholder: 'Paciente, especialidade, abordagem...',
    searchText: proposalSearchText,
    selects: [
      proposalStatusFilter(this.isHistory ? ['aceita', 'recusada', 'cancelada'] : ['pendente', 'aceita']),
      modalityFilter((proposal: Proposal) => proposal.request.modality),
    ],
    sorts: PROPOSAL_SORTS,
  });
  protected readonly proposalToCancel = signal<Proposal | null>(null);
  protected readonly reacceptNotice = reacceptNotice;
  protected readonly confirmingCancel = signal(false);
  protected readonly cancelConsequences = CANCEL_ACCEPTED_PROPOSAL_CONSEQUENCES;
  protected readonly isCancelling = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.proposalService.listMine().subscribe({
      next: (proposals) => {
        this.proposals.set(proposals);
        this.viewState.set(this.visibleProposals().length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected requestSummary(proposal: Proposal): string {
    return requestedProfessionalsSummary(proposal.request);
  }

  protected canEdit(proposal: Proposal): boolean {
    return this.proposalService.canEdit(proposal);
  }

  protected canCancel(proposal: Proposal): boolean {
    return (
      this.proposalService.canCancel(proposal) && (!proposal.attendance || proposal.attendance.status === 'cancelado')
    );
  }

  protected canResend(proposal: Proposal): boolean {
    return this.proposalService.canResend(proposal, this.proposals());
  }

  protected askToCancel(proposal: Proposal): void {
    this.proposalToCancel.set(proposal);
    if (proposal.status === 'aceita') {
      this.confirmingCancel.set(true);
    } else {
      this.confirmCancel();
    }
  }

  protected closeCancelDialog(): void {
    this.confirmingCancel.set(false);
    this.proposalToCancel.set(null);
  }

  protected confirmCancel(): void {
    const proposal = this.proposalToCancel();
    if (!proposal) {
      return;
    }

    this.isCancelling.set(true);
    this.proposalService.cancel(proposal.id).subscribe({
      next: (updated) => {
        this.isCancelling.set(false);
        this.closeCancelDialog();
        this.proposals.update((proposals) => proposals.map((item) => (item.id === updated.id ? updated : item)));
        if (this.visibleProposals().length === 0) {
          this.viewState.set('empty');
        }
        this.toastService.info('Proposta cancelada. Ela foi para o histórico.');
      },
      error: (error: Error) => {
        this.isCancelling.set(false);
        if (!this.confirmingCancel()) {
          this.proposalToCancel.set(null);
        }
        this.toastService.error(error.message);
      },
    });
  }
}
