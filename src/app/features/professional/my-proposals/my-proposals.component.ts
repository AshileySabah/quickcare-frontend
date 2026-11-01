import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProposalService } from '../../../core/services/proposal.service';
import { Proposal, ProposalStatus, RequestStatus, requestedProfessionalsSummary } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { ProposalCardComponent } from '../../../shared/ui/proposal-card/proposal-card.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

/** Como no histórico do paciente: encerrada é a proposta que já não anda mais. */
const CLOSED_PROPOSAL_STATUSES: ProposalStatus[] = ['recusada', 'cancelada'];
const CLOSED_REQUEST_STATUSES: RequestStatus[] = ['concluida', 'cancelada'];

function isClosed(proposal: Proposal): boolean {
  return (
    CLOSED_PROPOSAL_STATUSES.includes(proposal.status) || CLOSED_REQUEST_STATUSES.includes(proposal.request.status)
  );
}

/**
 * "Minhas propostas" mostra as ativas (pendentes e aceitas em solicitações em
 * curso); a rota de histórico (data.view = 'history') mostra as encerradas.
 */
@Component({
  selector: 'app-my-proposals',
  standalone: true,
  imports: [RouterLink, ButtonComponent, CardComponent, EmptyStateComponent, ErrorStateComponent, ProposalCardComponent, SkeletonComponent],
  templateUrl: './my-proposals.component.html',
  styleUrl: './my-proposals.component.scss',
})
export class MyProposalsComponent {
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);

  protected readonly isHistory = inject(ActivatedRoute).snapshot.data['view'] === 'history';

  protected readonly viewState = signal<ViewState>('loading');
  private readonly proposals = signal<Proposal[]>([]);
  protected readonly visibleProposals = computed(() =>
    this.proposals().filter((proposal) => isClosed(proposal) === this.isHistory),
  );
  protected readonly cancellingId = signal<string | null>(null);

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
    return this.proposalService.canCancel(proposal);
  }

  protected cancelProposal(id: string): void {
    this.cancellingId.set(id);

    this.proposalService.cancel(id).subscribe({
      next: (updated) => {
        this.cancellingId.set(null);
        this.proposals.update((proposals) => proposals.map((proposal) => (proposal.id === id ? updated : proposal)));
        if (this.visibleProposals().length === 0) {
          this.viewState.set('empty');
        }
        this.toastService.info('Proposta cancelada. Ela foi para o histórico.');
      },
      error: (error: Error) => {
        this.cancellingId.set(null);
        this.toastService.error(error.message);
      },
    });
  }
}
