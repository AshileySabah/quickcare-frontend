import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProposalInput, ProposalService } from '../../../core/services/proposal.service';
import { RequestService } from '../../../core/services/request.service';
import { Proposal, ServiceRequest } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { RequestSummaryComponent } from '../../../shared/ui/request-summary/request-summary.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { ProposalFormComponent } from '../proposal-form/proposal-form.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

@Component({
  selector: 'app-professional-request-detail',
  standalone: true,
  imports: [SkeletonListComponent, 
    CurrencyPipe,
    DatePipe,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ProposalFormComponent,
    RequestSummaryComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './professional-request-detail.component.html',
  styleUrl: './professional-request-detail.component.scss',
})
export class ProfessionalRequestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly requestService = inject(RequestService);
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);

  private readonly requestId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly request = signal<ServiceRequest | null>(null);
  protected readonly existingProposal = signal<Proposal | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isCancelling = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.pageState.set('loading');

    this.requestService.getById(this.requestId).subscribe({
      next: (request) => {
        if (!request) {
          this.pageState.set('not-found');
          return;
        }

        this.request.set(request);

        // Para o profissional a API devolve só as propostas dele; uma cancelada
        // não impede enviar outra.
        this.proposalService.listForRequest(this.requestId).subscribe({
          next: (proposals) => {
            this.existingProposal.set(proposals.find((proposal) => proposal.status !== 'cancelada') ?? null);
            this.pageState.set('filled');
          },
          error: () => this.pageState.set('error'),
        });
      },
      error: () => this.pageState.set('error'),
    });
  }

  protected submit(input: ProposalInput): void {
    this.isSubmitting.set(true);

    this.proposalService.submit(this.requestId, input).subscribe({
      next: (proposal) => {
        this.isSubmitting.set(false);
        this.existingProposal.set(proposal);
        this.request.update((request) => (request ? { ...request, status: proposal.request.status } : request));
        this.toastService.success('Proposta enviada com sucesso!');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected canEdit(proposal: Proposal): boolean {
    return this.proposalService.canEdit(proposal);
  }

  protected canCancel(proposal: Proposal): boolean {
    return this.proposalService.canCancel(proposal);
  }

  protected cancelProposal(proposal: Proposal): void {
    this.isCancelling.set(true);

    this.proposalService.cancel(proposal.id).subscribe({
      next: (cancelled) => {
        this.isCancelling.set(false);
        this.existingProposal.set(null);
        this.request.update((request) => (request ? { ...request, status: cancelled.request.status } : request));
        this.toastService.info('Proposta cancelada.');
      },
      error: (error: Error) => {
        this.isCancelling.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
