import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CANCEL_ACCEPTED_PROPOSAL_CONSEQUENCES,
  ProposalInput,
  ProposalService,
  resendBase,
} from '../../../core/services/proposal.service';
import { RequestService } from '../../../core/services/request.service';
import { PatientPublicProfile, Proposal, ServiceRequest, reacceptNotice } from '../../../core/models';
import { PublicProfileService } from '../../../core/services/public-profile.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { PersonMenuComponent } from '../../user-blocks/person-menu/person-menu.component';
import { RequestSummaryComponent } from '../../../shared/ui/request-summary/request-summary.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { ProposalFormComponent } from '../proposal-form/proposal-form.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EditProposalActionComponent } from '../../../features/professional/edit-proposal-action/edit-proposal-action.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { HighlightDirective } from '../../../shared/ui/highlight/highlight.directive';
import { AttendancePanelComponent } from '../../attendance/attendance-panel/attendance-panel.component';
import { formatPeriod } from '../../../core/formatting/period';
import { OccurrenceService } from '../../../core/services/occurrence.service';
import { BlockedNoticeComponent } from '../../occurrences/blocked-notice/blocked-notice.component';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

@Component({
  selector: 'app-professional-request-detail',
  standalone: true,
  imports: [BlockedNoticeComponent, HighlightDirective, AttendancePanelComponent, NoticeComponent, EditProposalActionComponent, ConfirmDialogComponent, BackLinkComponent, IconComponent, SkeletonListComponent, 
    CurrencyPipe,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PersonMenuComponent,
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
  private readonly publicProfileService = inject(PublicProfileService);
  protected readonly blocked = inject(OccurrenceService).blockFor('professional');

  private readonly requestId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly request = signal<ServiceRequest | null>(null);
  protected readonly existingProposal = signal<Proposal | null>(null);
  protected readonly previousProposal = signal<Proposal | null>(null);
  protected readonly resendValue = computed<ProposalInput | null>(() => {
    const previous = this.previousProposal();
    return previous ? { price: previous.price, approach: previous.approach, start: '', end: '' } : null;
  });
  protected readonly patient = signal<PatientPublicProfile | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isCancelling = signal(false);
  protected readonly confirmingCancel = signal(false);
  protected readonly reacceptNotice = reacceptNotice;
  protected readonly cancelConsequences = CANCEL_ACCEPTED_PROPOSAL_CONSEQUENCES;

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

        this.proposalService.listForRequest(this.requestId).subscribe({
          next: (proposals) => {
            this.existingProposal.set(
              proposals.find((proposal) => proposal.status === 'pendente' || proposal.status === 'aceita') ?? null,
            );
            this.previousProposal.set(resendBase(proposals));
            this.loadPatient();
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
        this.previousProposal.set(null);
        this.request.update((request) => (request ? { ...request, status: proposal.request.status } : request));
        this.loadPatient();
        this.toastService.success('Proposta enviada com sucesso!');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private loadPatient(): void {
    const request = this.request();
    if (!request || this.existingProposal()?.status !== 'aceita') {
      return;
    }

    this.publicProfileService.getPatient(request.patientId).subscribe({
      next: (patient) => this.patient.set(patient ?? null),
      error: () => this.patient.set(null),
    });
  }

  protected canEdit(proposal: Proposal): boolean {
    return this.proposalService.canEdit(proposal);
  }

  protected canCancel(proposal: Proposal): boolean {
    return this.proposalService.canCancel(proposal) && !this.hasActiveAttendance(proposal);
  }

  protected hasActiveAttendance(proposal: Proposal): boolean {
    return !!proposal.attendance && proposal.attendance.status !== 'cancelado';
  }

  protected period(proposal: Proposal): string {
    return formatPeriod(proposal.start, proposal.end);
  }

  protected refresh(): void {
    this.requestService.getById(this.requestId).subscribe((request) => request && this.request.set(request));
    this.proposalService.listForRequest(this.requestId).subscribe((proposals) => {
      this.existingProposal.set(
        proposals.find((proposal) => proposal.status === 'pendente' || proposal.status === 'aceita') ?? null,
      );
      this.previousProposal.set(resendBase(proposals));
    });
  }

  protected askToCancel(proposal: Proposal): void {
    if (proposal.status === 'aceita') {
      this.confirmingCancel.set(true);
    } else {
      this.confirmCancel();
    }
  }

  protected confirmCancel(): void {
    const proposal = this.existingProposal();
    if (!proposal) {
      return;
    }

    this.isCancelling.set(true);

    this.proposalService.cancel(proposal.id).subscribe({
      next: (cancelled) => {
        this.isCancelling.set(false);
        this.confirmingCancel.set(false);
        this.existingProposal.set(null);
        this.previousProposal.set(cancelled);
        this.patient.set(null);
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
