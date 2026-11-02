import { Component, inject, input, output, signal } from '@angular/core';
import { BlockTarget, BlockTargetKind } from '../../../core/models';
import { UserBlockService } from '../../../core/services/user-block.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { BlockUserDialogComponent } from '../block-user-dialog/block-user-dialog.component';

/**
 * "Bloquear" (ou "Desbloquear", se quem vê já bloqueou) no perfil de outra
 * pessoa. Avisa a tela (`changed`) para recarregar o perfil.
 */
@Component({
  selector: 'app-profile-block-action',
  standalone: true,
  imports: [BlockUserDialogComponent, ButtonComponent, ConfirmDialogComponent, IconComponent],
  template: `
    @if (blockId()) {
      <ui-button variant="secondary" size="sm" [loading]="isUnblocking()" (click)="confirmingUnblock.set(true)">
        Desbloquear
      </ui-button>
    } @else {
      <ui-button variant="danger-outline" size="sm" (click)="askToBlock()">
        <ui-icon name="ban"></ui-icon>
        Bloquear
      </ui-button>
    }

    <app-block-user-dialog
      [target]="toBlock()"
      (blocked)="onBlocked()"
      (closed)="toBlock.set(null)"
    ></app-block-user-dialog>

    <ui-confirm-dialog
      [open]="confirmingUnblock()"
      titleText="Desbloquear"
      icon="refresh"
      [message]="'Desbloquear ' + name() + '?'"
      [consequences]="unblockConsequences"
      confirmLabel="Sim, desbloquear"
      cancelLabel="Não, manter o bloqueio"
      [loading]="isUnblocking()"
      (confirmed)="unblock()"
      (closed)="confirmingUnblock.set(false)"
    ></ui-confirm-dialog>
  `,
})
export class ProfileBlockActionComponent {
  private readonly userBlockService = inject(UserBlockService);
  private readonly toastService = inject(ToastService);

  kind = input.required<BlockTargetKind>();
  personId = input.required<string>();
  name = input.required<string>();
  /** O bloqueio que quem vê já fez desta pessoa. */
  blockId = input<string | undefined>(undefined);

  readonly changed = output<void>();

  protected readonly toBlock = signal<BlockTarget | null>(null);
  protected readonly confirmingUnblock = signal(false);
  protected readonly isUnblocking = signal(false);

  protected readonly unblockConsequences = [
    'Vocês voltam a poder trocar solicitações e propostas.',
    'O que foi encerrado no bloqueio não volta.',
  ];

  protected askToBlock(): void {
    this.toBlock.set({ kind: this.kind(), id: this.personId(), name: this.name() });
  }

  protected onBlocked(): void {
    this.toBlock.set(null);
    this.changed.emit();
  }

  protected unblock(): void {
    const id = this.blockId();
    if (!id) {
      return;
    }
    this.isUnblocking.set(true);
    this.userBlockService.unblock(id).subscribe({
      next: () => {
        this.isUnblocking.set(false);
        this.confirmingUnblock.set(false);
        this.toastService.success(`Você desbloqueou ${this.name()}.`);
        this.changed.emit();
      },
      error: (error: Error) => {
        this.isUnblocking.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
