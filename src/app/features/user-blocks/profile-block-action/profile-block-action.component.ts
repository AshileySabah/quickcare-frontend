import { Component, input, output, signal } from '@angular/core';
import { BlockTarget, BlockTargetKind } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { BlockUserDialogComponent } from '../block-user-dialog/block-user-dialog.component';

@Component({
  selector: 'app-profile-block-action',
  standalone: true,
  imports: [BlockUserDialogComponent, ButtonComponent, IconComponent],
  template: `
    <ui-button variant="danger-outline" size="sm" (click)="askToBlock()">
      <ui-icon name="ban"></ui-icon>
      Bloquear
    </ui-button>

    <app-block-user-dialog
      [target]="toBlock()"
      (blocked)="onBlocked()"
      (closed)="toBlock.set(null)"
    ></app-block-user-dialog>
  `,
})
export class ProfileBlockActionComponent {
  kind = input.required<BlockTargetKind>();
  personId = input.required<string>();
  name = input.required<string>();

  readonly changed = output<void>();

  protected readonly toBlock = signal<BlockTarget | null>(null);

  protected askToBlock(): void {
    this.toBlock.set({ kind: this.kind(), id: this.personId(), name: this.name() });
  }

  protected onBlocked(): void {
    this.toBlock.set(null);
    this.changed.emit();
  }
}
