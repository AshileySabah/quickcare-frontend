import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ProposalService } from '../../../core/services/proposal.service';
import { RequestService } from '../../../core/services/request.service';
import { ProfessionalValidationStatus, Proposal, ServiceRequest, Specialty } from '../../../core/models';
import { PROFESSIONALS_MOCK } from '../../../mocks';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { ModalComponent } from '../../../shared/ui/layout/modal/modal.component';
import { ProposalCardComponent } from '../../../shared/ui/proposal-card/proposal-card.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';
type ProposalsState = 'loading' | 'error' | 'empty' | 'filled';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ModalComponent,
    ProposalCardComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './request-detail.component.html',
  styleUrl: './request-detail.component.scss',
})
export class RequestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);
  private readonly specialtyService = inject(SpecialtyService);

  private readonly requestId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly request = signal<ServiceRequest | null>(null);

  protected readonly proposalsState = signal<ProposalsState>('loading');
  protected readonly proposals = signal<Proposal[]>([]);

  protected readonly proposalToAccept = signal<Proposal | null>(null);
  protected readonly isAccepting = signal(false);
  private readonly specialties = signal<Specialty[]>([]);

  constructor() {
    this.specialtyService.list().subscribe((specialties) => this.specialties.set(specialties));
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

  protected specialtyName(specialtyId: string): string {
    return this.specialties().find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId;
  }

  protected professionalName(professionalId: string): string {
    return PROFESSIONALS_MOCK.find((professional) => professional.id === professionalId)?.name ?? 'Profissional';
  }

  protected professionalValidationStatus(professionalId: string): ProfessionalValidationStatus | null {
    return PROFESSIONALS_MOCK.find((professional) => professional.id === professionalId)?.validationStatus ?? null;
  }

  protected canEdit(request: ServiceRequest): boolean {
    return this.requestService.canEdit(request);
  }

  protected canCancel(request: ServiceRequest): boolean {
    return this.requestService.canCancel(request);
  }

  protected cancelRequest(): void {
    this.requestService.cancel(this.requestId).subscribe({
      next: (updated) => {
        this.request.set(updated);
        this.toastService.info('Solicitação cancelada.');
      },
      error: (error: Error) => this.toastService.error(error.message),
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

    this.proposalService.acceptProposal(proposal.id).subscribe({
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
