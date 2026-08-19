import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ProposalService } from '../../../core/services/proposal.service';
import { RequestService } from '../../../core/services/request.service';
import { Proposal, ServiceRequest } from '../../../core/models';
import { PATIENTS_MOCK, SPECIALTIES_MOCK } from '../../../mocks';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { ProposalCardComponent } from '../../../shared/ui/proposal-card/proposal-card.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

@Component({
  selector: 'app-my-proposals',
  standalone: true,
  imports: [RouterLink, ButtonComponent, CardComponent, EmptyStateComponent, ErrorStateComponent, ProposalCardComponent, SkeletonComponent],
  templateUrl: './my-proposals.component.html',
  styleUrl: './my-proposals.component.scss',
})
export class MyProposalsComponent {
  private readonly authService = inject(AuthService);
  private readonly proposalService = inject(ProposalService);
  private readonly requestService = inject(RequestService);
  private readonly toastService = inject(ToastService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly proposals = signal<Proposal[]>([]);
  private readonly requestsById = signal<Map<string, ServiceRequest>>(new Map());

  constructor() {
    this.load();
  }

  protected load(): void {
    const professionalId = this.authService.currentUser()?.id;

    if (!professionalId) {
      return;
    }

    this.viewState.set('loading');

    this.proposalService.listForProfessional(professionalId).subscribe({
      next: (proposals) => {
        this.proposals.set(proposals);
        this.viewState.set(proposals.length === 0 ? 'empty' : 'filled');
        this.loadRequests();
      },
      error: () => this.viewState.set('error'),
    });
  }

  private loadRequests(): void {
    this.requestService.list().subscribe((requests) => {
      this.requestsById.set(new Map(requests.map((request) => [request.id, request])));
    });
  }

  protected specialtyName(requestId: string): string {
    const specialtyId = this.requestsById().get(requestId)?.specialtyId;
    return SPECIALTIES_MOCK.find((specialty) => specialty.id === specialtyId)?.name ?? 'Solicitação';
  }

  protected patientName(requestId: string): string {
    const patientId = this.requestsById().get(requestId)?.patientId;
    return PATIENTS_MOCK.find((patient) => patient.id === patientId)?.name ?? 'Paciente';
  }

  protected canEdit(proposal: Proposal): boolean {
    return this.proposalService.canEdit(proposal);
  }

  protected canCancel(proposal: Proposal): boolean {
    return this.proposalService.canCancel(proposal);
  }

  protected cancelProposal(id: string): void {
    this.proposalService.cancel(id).subscribe({
      next: (updated) => {
        this.proposals.update((proposals) => proposals.map((proposal) => (proposal.id === id ? updated : proposal)));
        this.toastService.info('Proposta cancelada.');
      },
      error: (error: Error) => this.toastService.error(error.message),
    });
  }
}
