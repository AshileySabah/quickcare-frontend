import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceRequest } from '../../../core/models';
import { EDIT_REQUEST_WITH_ACCEPTED_CONSEQUENCES, hasAcceptedProposals } from '../../../core/services/request.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Botão "Editar" da solicitação. Sem propostas aceitas, abre a edição direto;
 * com aceitas, antes avisa que as vagas reabrem e é preciso aceitar de novo.
 */
@Component({
  selector: 'app-edit-request-action',
  standalone: true,
  imports: [ButtonComponent, ConfirmDialogComponent, IconComponent],
  template: `
    <ui-button variant="secondary" size="sm" (click)="edit()">
      <ui-icon name="pencil"></ui-icon>
      Editar
    </ui-button>

    <ui-confirm-dialog
      [open]="confirming()"
      titleText="Editar solicitação"
      icon="pencil"
      message="Editar esta solicitação, que já tem propostas aceitas?"
      [consequences]="consequences"
      confirmLabel="Sim, editar a solicitação"
      cancelLabel="Não, manter como está"
      (confirmed)="goToEdit()"
      (closed)="confirming.set(false)"
    ></ui-confirm-dialog>
  `,
})
export class EditRequestActionComponent {
  private readonly router = inject(Router);

  request = input.required<ServiceRequest>();

  protected readonly confirming = signal(false);
  protected readonly consequences = EDIT_REQUEST_WITH_ACCEPTED_CONSEQUENCES;

  protected edit(): void {
    if (hasAcceptedProposals(this.request())) {
      this.confirming.set(true);
    } else {
      this.goToEdit();
    }
  }

  protected goToEdit(): void {
    this.confirming.set(false);
    this.router.navigate(['/patient/solicitacoes', this.request().id, 'editar']);
  }
}
