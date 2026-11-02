import { Component, computed, input, output } from '@angular/core';
import { ButtonComponent, ButtonVariant } from '../button/button.component';
import { IconComponent, IconName } from '../icon/icon.component';
import { ModalComponent } from '../layout/modal/modal.component';

/**
 * Pede confirmação antes de uma ação importante (cancelar, aceitar, salvar
 * algo já aceito): pergunta, o que acontece em seguida e os dois botões lado
 * a lado. Enquanto `loading`, não fecha.
 */
@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  imports: [ButtonComponent, IconComponent, ModalComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  open = input.required<boolean>();
  titleText = input.required<string>();
  /** A pergunta, em uma frase. */
  message = input.required<string>();
  /** O que acontece se confirmar, em itens curtos. */
  consequences = input<string[]>([]);
  icon = input<IconName | null>(null);
  confirmLabel = input.required<string>();
  /** O par do confirmar, no mesmo tom: "Sim, cancelar a proposta" / "Não, manter a proposta". */
  cancelLabel = input.required<string>();
  confirmVariant = input<ButtonVariant>('primary');
  loading = input(false);

  /** O desistir acompanha o tom da ação: contorno vermelho quando ela é destrutiva. */
  protected readonly cancelVariant = computed<ButtonVariant>(() =>
    this.confirmVariant() === 'danger' ? 'danger-outline' : 'secondary',
  );

  readonly confirmed = output<void>();
  readonly closed = output<void>();

  protected close(): void {
    if (!this.loading()) {
      this.closed.emit();
    }
  }
}
