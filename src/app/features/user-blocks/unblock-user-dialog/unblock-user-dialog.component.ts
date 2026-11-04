import { Component, inject, input, output, signal } from '@angular/core';
import { UserBlockService } from '../../../core/services/user-block.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

export interface UnblockTarget {
  blockId: string;
  name: string;
}

@Component({
  selector: 'app-unblock-user-dialog',
  standalone: true,
  imports: [ConfirmDialogComponent],
  template: `
    <ui-confirm-dialog
      [open]="target() !== null"
      titleText="Desbloquear"
      icon="refresh"
      [message]="'Desbloquear ' + (target()?.name ?? '') + '?'"
      [consequences]="consequences"
      confirmLabel="Sim, desbloquear"
      cancelLabel="Não, manter o bloqueio"
      [loading]="isUnblocking()"
      (confirmed)="confirm()"
      (closed)="closed.emit()"
    ></ui-confirm-dialog>
  `,
})
export class UnblockUserDialogComponent {
  private readonly userBlockService = inject(UserBlockService);
  private readonly toastService = inject(ToastService);

  target = input<UnblockTarget | null>(null);

  readonly unblocked = output<string>();
  readonly closed = output<void>();

  protected readonly isUnblocking = signal(false);

  protected readonly consequences = [
    'Vocês voltam a poder trocar solicitações e propostas.',
    'O que foi encerrado no bloqueio não volta.',
  ];

  protected confirm(): void {
    const target = this.target();
    if (!target) {
      return;
    }
    this.isUnblocking.set(true);
    this.userBlockService.unblock(target.blockId).subscribe({
      next: () => {
        this.isUnblocking.set(false);
        this.toastService.success(`Você desbloqueou ${target.name}.`);
        this.unblocked.emit(target.blockId);
      },
      error: (error: Error) => {
        this.isUnblocking.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
