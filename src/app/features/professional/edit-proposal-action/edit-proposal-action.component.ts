import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Proposal } from '../../../core/models';
import { EDIT_ACCEPTED_PROPOSAL_CONSEQUENCES } from '../../../core/services/proposal.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Botão "Editar" da proposta. Pendente, abre a edição direto; já aceita,
 * antes avisa que ela deixa de estar aceita e o paciente precisa aceitar de novo.
 */
@Component({
  selector: 'app-edit-proposal-action',
  standalone: true,
  imports: [ButtonComponent, ConfirmDialogComponent, IconComponent],
  template: `
    <ui-button variant="secondary" size="sm" (click)="edit()">
      <ui-icon name="pencil"></ui-icon>
      Editar
    </ui-button>

    <ui-confirm-dialog
      [open]="confirming()"
      titleText="Editar proposta"
      icon="pencil"
      message="Editar a sua proposta já aceita?"
      [consequences]="consequences"
      confirmLabel="Sim, editar a proposta"
      cancelLabel="Não, manter como está"
      (confirmed)="goToEdit()"
      (closed)="confirming.set(false)"
    ></ui-confirm-dialog>
  `,
})
export class EditProposalActionComponent {
  private readonly router = inject(Router);

  proposal = input.required<Proposal>();

  protected readonly confirming = signal(false);
  protected readonly consequences = EDIT_ACCEPTED_PROPOSAL_CONSEQUENCES;

  protected edit(): void {
    if (this.proposal().status === 'aceita') {
      this.confirming.set(true);
    } else {
      this.goToEdit();
    }
  }

  protected goToEdit(): void {
    this.confirming.set(false);
    this.router.navigate(['/professional/propostas', this.proposal().id, 'editar']);
  }
}
