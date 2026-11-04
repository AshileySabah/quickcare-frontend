import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { BlockPreview, BlockTarget, BlockedUser } from '../../../core/models';
import { UserBlockService } from '../../../core/services/user-block.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';

@Component({
  selector: 'app-block-user-dialog',
  standalone: true,
  imports: [ConfirmDialogComponent, JustificationDialogComponent],
  template: `
    @if (preview()?.late) {
      <ui-justification-dialog
        [open]="target() !== null"
        titleText="Bloquear"
        icon="ban"
        confirmVariant="danger"
        [message]="message()"
        [consequences]="consequences()"
        [warning]="lateWarning"
        [confirmLabel]="'Sim, bloquear ' + noun()"
        [cancelLabel]="'Não, manter ' + noun()"
        fieldLabel="Motivo do bloqueio (opcional)"
        [required]="false"
        hint="Com motivo, o administrador analisa e decide se lança a ocorrência. Sem motivo, a ocorrência é lançada na hora."
        [loading]="isBlocking()"
        (confirmed)="confirm($event)"
        (closed)="closed.emit()"
      ></ui-justification-dialog>
    } @else {
      <ui-confirm-dialog
        [open]="target() !== null"
        titleText="Bloquear"
        icon="ban"
        confirmVariant="danger"
        [message]="message()"
        [consequences]="consequences()"
        [confirmLabel]="'Sim, bloquear ' + noun()"
        [cancelLabel]="'Não, manter ' + noun()"
        [loading]="isBlocking() || isLoadingPreview()"
        (confirmed)="confirm()"
        (closed)="closed.emit()"
      ></ui-confirm-dialog>
    }
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
  protected readonly lateWarning =
    'Falta menos de 48h para um atendimento aceito: o bloqueio acontece de qualquer forma, mas pode contar como ocorrência para você.';
  protected readonly message = computed(() => `Bloquear ${this.target()?.name ?? ''}?`);

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
      'Vocês deixam de ver o nome, a foto e o perfil um do outro. No histórico aparece "Perfil não disponível".',
    ];
    if (preview?.pendingProposals) {
      items.push(
        target.kind === 'professional'
          ? `${plural(preview.pendingProposals, 'proposta pendente desse profissional será recusada', 'propostas pendentes desse profissional serão recusadas')}.`
          : `${plural(preview.pendingProposals, 'proposta pendente sua será cancelada', 'propostas pendentes suas serão canceladas')}.`,
      );
    }
    if (preview?.acceptedProposals) {
      items.push(
        target.kind === 'professional'
          ? `${plural(preview.acceptedProposals, 'proposta que você aceitou desse profissional passa', 'propostas que você aceitou desse profissional passam')} para recusada e o atendimento é cancelado. Fica no histórico.`
          : `${plural(preview.acceptedProposals, 'proposta sua que esse paciente aceitou passa', 'propostas suas que esse paciente aceitou passam')} para recusada e o atendimento é cancelado. Fica no histórico.`,
      );
    }
    if (!preview?.late) {
      items.push('O bloqueio não conta como ocorrência para você.');
    }
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

  protected confirm(reason?: string): void {
    const target = this.target();
    if (!target) {
      return;
    }
    this.isBlocking.set(true);
    this.userBlockService.block(target.kind, target.id, reason).subscribe({
      next: (blocked) => {
        this.isBlocking.set(false);
        this.toastService.success(
          this.preview()?.late
            ? reason?.trim()
              ? `Pronto, você bloqueou ${target.name}. O motivo foi enviado para análise do administrador.`
              : `Pronto, você bloqueou ${target.name}. Como foi sem motivo, a ocorrência foi lançada.`
            : `Pronto, você bloqueou ${target.name}.`,
        );
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
