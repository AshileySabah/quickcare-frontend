import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProposalService } from '../../../core/services/proposal.service';
import { CANCEL_REQUEST_CONSEQUENCES, RequestService, hasAcceptedProposals } from '../../../core/services/request.service';
import { Proposal, ServiceRequest, reacceptNotice } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ButtonGroupComponent } from '../../../shared/ui/button-group/button-group.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { ProposalCardComponent } from '../../../shared/ui/proposal-card/proposal-card.component';
import { RequestSummaryComponent } from '../../../shared/ui/request-summary/request-summary.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EditRequestActionComponent } from '../../../features/patient/edit-request-action/edit-request-action.component';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';
type ProposalsState = 'loading' | 'error' | 'empty' | 'filled';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [EditRequestActionComponent, ConfirmDialogComponent, BackLinkComponent, IconComponent, SkeletonListComponent, 
    RouterLink,
    ButtonComponent, ButtonGroupComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ProposalCardComponent,
    RequestSummaryComponent,
  ],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly requestService = inject(RequestService);
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);

  private readonly requestId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly request = signal<ServiceRequest | null>(null);

  protected readonly proposalsState = signal<ProposalsState>('loading');
  protected readonly proposals = signal<Proposal[]>([]);

  protected readonly proposalToAccept = signal<Proposal | null>(null);
  protected readonly isAccepting = signal(false);
  protected readonly reacceptNotice = reacceptNotice;
  protected readonly cancelConsequences = CANCEL_REQUEST_CONSEQUENCES;
  protected readonly acceptConsequences = [
    'O profissional ocupa uma das vagas pedidas e passa a ver seus dados.',
    'Propostas que não couberem nas vagas restantes serão recusadas.',
    'A solicitação entra em andamento quando todas as vagas forem preenchidas.',
  ];
  protected readonly rejectConsequences = [
    'O profissional verá que a proposta foi recusada.',
    'Enquanto a solicitação receber propostas, ele pode enviar uma nova.',
  ];
  protected readonly confirmingCancel = signal(false);
  protected readonly proposalToReject = signal<Proposal | null>(null);
  protected readonly isRejecting = signal(false);
  protected readonly isCancelling = signal(false);

  constructor() {
    this.loadRequest();
  }

  protected loadRequest(): void {
    this.pageState.set('loading');

    this.requestService.getById(this.requestId).subscribe({
      next: (request) => {
        if (!request) {
          this.pageState.set('not-found');
          return;
        }

        this.request.set(request);
        this.pageState.set('filled');
        this.loadProposals();
      },
      error: () => this.pageState.set('error'),
    });
  }

  protected loadProposals(): void {
    this.proposalsState.set('loading');

    this.proposalService.listForRequest(this.requestId).subscribe({
      next: (proposals) => {
        this.proposals.set(proposals);
        this.proposalsState.set(proposals.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.proposalsState.set('error'),
    });
  }

  /** Ex.: "Enfermeiro(a) — Curativos, Sondagem". */
  protected professionalDescription(proposal: Proposal): string {
    const specialties = proposal.professional.specialties.map((specialty) => specialty.name).join(', ');
    return specialties ? `${proposal.professional.categoryLabel} — ${specialties}` : proposal.professional.categoryLabel;
  }

  protected canEdit(request: ServiceRequest): boolean {
    return this.requestService.canEdit(request);
  }

  protected canReceiveProposals(request: ServiceRequest): boolean {
    return this.requestService.canReceiveProposals(request);
  }

  protected canCancel(request: ServiceRequest): boolean {
    return this.requestService.canCancel(request);
  }

  /** Sem propostas aceitas cancela direto; com aceitas, pergunta antes. */
  protected askToCancel(request: ServiceRequest): void {
    if (hasAcceptedProposals(request)) {
      this.confirmingCancel.set(true);
    } else {
      this.confirmCancel();
    }
  }

  protected confirmCancel(): void {
    this.isCancelling.set(true);
    this.requestService.cancel(this.requestId).subscribe({
      next: (updated) => {
        this.isCancelling.set(false);
        this.confirmingCancel.set(false);
        this.request.set(updated);
        // As propostas pendentes são recusadas junto com o cancelamento.
        this.loadProposals();
        this.toastService.info('Solicitação cancelada.');
      },
      error: (error: Error) => {
        this.isCancelling.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected confirmReject(): void {
    const proposal = this.proposalToReject();
    if (!proposal) {
      return;
    }

    this.isRejecting.set(true);
    this.proposalService.reject(proposal.id).subscribe({
      next: () => {
        this.isRejecting.set(false);
        this.proposalToReject.set(null);
        this.toastService.info('Proposta recusada.');
        this.loadRequest();
      },
      error: (error: Error) => {
        this.isRejecting.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected askToAccept(proposal: Proposal): void {
    this.proposalToAccept.set(proposal);
  }

  protected closeAcceptModal(): void {
    this.proposalToAccept.set(null);
  }

  protected confirmAccept(): void {
    const proposal = this.proposalToAccept();

    if (!proposal) {
      return;
    }

    this.isAccepting.set(true);

    this.proposalService.accept(proposal.id).subscribe({
      next: () => {
        this.isAccepting.set(false);
        this.proposalToAccept.set(null);
        this.toastService.success('Proposta aceita!');
        this.loadRequest();
      },
      error: (error: Error) => {
        this.isAccepting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
