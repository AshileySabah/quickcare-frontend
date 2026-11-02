import { Component, computed, input, output } from '@angular/core';
import { ButtonComponent, ButtonVariant } from '../button/button.component';
import { IconComponent, IconName } from '../icon/icon.component';
import { ModalComponent } from '../layout/modal/modal.component';

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
  message = input.required<string>();
  consequences = input<string[]>([]);
  icon = input<IconName | null>(null);
  confirmLabel = input.required<string>();
  cancelLabel = input.required<string>();
  confirmVariant = input<ButtonVariant>('primary');
  loading = input(false);

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
