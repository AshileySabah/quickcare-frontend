import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { BlockPreview, BlockTarget, BlockedUser } from '../../../core/models';
import { UserBlockService } from '../../../core/services/user-block.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

@Component({
  selector: 'app-block-user-dialog',
  standalone: true,
  imports: [ConfirmDialogComponent],
  template: `
    <ui-confirm-dialog
      [open]="target() !== null"
      titleText="Bloquear"
      icon="ban"
      confirmVariant="danger"
      [message]="'Bloquear ' + (target()?.name ?? '') + '?'"
      [consequences]="consequences()"
      [confirmLabel]="'Sim, bloquear ' + noun()"
      [cancelLabel]="'Não, manter ' + noun()"
      [loading]="isBlocking() || isLoadingPreview()"
      (confirmed)="confirm()"
      (closed)="closed.emit()"
    ></ui-confirm-dialog>
  `,
})
export class BlockUserDialogComponent {
  private readonly userBlockService = inject(UserBlockService);
  private readonly toastService = inject(ToastService);

  target = input<BlockTarget | null>(null);

  readonly blocked = output<BlockedUser>();
  readonly closed = output<void>();

  protected readonly preview = signal<BlockPreview | null>(null);
  protected readonly isLoadingPreview = signal(false);
  protected readonly isBlocking = signal(false);

  protected readonly noun = computed(() => (this.target()?.kind === 'patient' ? 'o paciente' : 'o profissional'));

  protected readonly consequences = computed(() => {
    const target = this.target();
    const preview = this.preview();
    if (!target) {
      return [];
    }
    const items = [
      target.kind === 'professional'
        ? 'O profissional deixa de ver as suas solicitações e não pode mais enviar propostas para você.'
        : 'Você deixa de ver as solicitações desse paciente e não pode mais enviar propostas para elas.',
    ];
    if (preview?.pendingProposals) {
      items.push(
        target.kind === 'professional'
          ? `${plural(preview.pendingProposals, 'proposta pendente desse profissional será recusada', 'propostas pendentes desse profissional serão recusadas')}.`
          : `${plural(preview.pendingProposals, 'proposta pendente sua será cancelada', 'propostas pendentes suas serão canceladas')}.`,
      );
    }
    if (preview?.activeAttendances) {
      items.push(
        `${plural(preview.activeAttendances, 'atendimento em curso entre vocês será cancelado', 'atendimentos em curso entre vocês serão cancelados')} e ficará no histórico.`,
      );
    }
    if (preview?.countsAsOccurrence) {
      items.push('Como falta menos de 48h para um atendimento aceito, isso conta como ocorrência para você (cabe recurso).');
    }
    items.push('Os atendimentos já realizados continuam no seu histórico.');
    items.push('A pessoa bloqueada não é avisada do bloqueio. Para desfazer, use "Usuários bloqueados", no menu da sua conta.');
    return items;
  });

  constructor() {
    effect(() => {
      const target = this.target();
      untracked(() => {
        this.preview.set(null);
        if (target) {
          this.loadPreview(target);
        }
      });
    });
  }

  protected confirm(): void {
    const target = this.target();
    if (!target) {
      return;
    }
    this.isBlocking.set(true);
    this.userBlockService.block(target.kind, target.id).subscribe({
      next: (blocked) => {
        this.isBlocking.set(false);
        this.toastService.success(`Pronto, você bloqueou ${target.name}.`);
        this.blocked.emit(blocked);
      },
      error: (error: Error) => {
        this.isBlocking.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private loadPreview(target: BlockTarget): void {
    this.isLoadingPreview.set(true);
    this.userBlockService.preview(target.kind, target.id).subscribe({
      next: (preview) => {
        this.isLoadingPreview.set(false);
        this.preview.set(preview);
      },
      error: (error: Error) => {
        this.isLoadingPreview.set(false);
        this.toastService.error(error.message);
        this.closed.emit();
      },
    });
  }
}

function plural(count: number, one: string, other: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${other}`;
}
