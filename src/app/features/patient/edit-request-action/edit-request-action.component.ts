import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceRequest } from '../../../core/models';
import {
  EDIT_REQUEST_WITH_ACCEPTED_CONSEQUENCES,
  hasAcceptedProposals,
  isLateChange,
} from '../../../core/services/request.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

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
      [message]="message()"
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
  protected readonly message = computed(() =>
    isLateChange(this.request())
      ? 'Falta menos de 48h para um atendimento desta solicitação. Editar mesmo assim?'
      : 'Editar esta solicitação, que já tem profissionais aceitos?',
  );

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
