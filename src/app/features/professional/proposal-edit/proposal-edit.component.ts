import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProposalInput, ProposalService } from '../../../core/services/proposal.service';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { ProposalFormComponent } from '../proposal-form/proposal-form.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';

@Component({
  selector: 'app-proposal-edit',
  standalone: true,
  imports: [NoticeComponent, BackLinkComponent, SkeletonListComponent, ProposalFormComponent],
  templateUrl: './proposal-edit.component.html',
  styleUrl: './proposal-edit.component.scss',
})
export class ProposalEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);

  private readonly proposalId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly proposal = signal<ProposalInput | null>(null);
  protected readonly isSubmitting = signal(false);
  /** A proposta aceita volta a aguardar o aceite ao salvar (a tela avisa). */
  protected readonly wasAccepted = signal(false);

  constructor() {
    this.proposalService.getById(this.proposalId).subscribe({
      next: (proposal) => {
        if (!proposal || !this.proposalService.canEdit(proposal)) {
          this.toastService.error('Esta proposta não pode mais ser editada.');
          this.router.navigateByUrl('/professional/propostas');
          return;
        }

        this.wasAccepted.set(proposal.status === 'aceita');
        this.proposal.set({ price: proposal.price, approach: proposal.approach, deadline: proposal.deadline });
      },
      error: () => {
        this.toastService.error('Não foi possível carregar a proposta.');
        this.router.navigateByUrl('/professional/propostas');
      },
    });
  }

  protected save(input: ProposalInput): void {
    this.isSubmitting.set(true);

    this.proposalService.update(this.proposalId, input).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(
          this.wasAccepted() ? 'Proposta atualizada. Ela aguarda um novo aceite do paciente.' : 'Proposta atualizada com sucesso!',
        );
        this.router.navigateByUrl('/professional/propostas');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
