import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlockTarget, BlockTargetKind, BlockedUser } from '../../../core/models';
import { DismissibleDirective } from '../../../shared/ui/dismissible/dismissible.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PersonChipComponent } from '../../../shared/ui/person-chip/person-chip.component';
import { BlockUserDialogComponent } from '../block-user-dialog/block-user-dialog.component';

@Component({
  selector: 'app-person-menu',
  standalone: true,
  imports: [RouterLink, BlockUserDialogComponent, DismissibleDirective, IconComponent, PersonChipComponent],
  templateUrl: './person-menu.component.html',
  styleUrl: './person-menu.component.scss',
})
export class PersonMenuComponent {
  kind = input.required<BlockTargetKind>();
  personId = input.required<string>();
  name = input.required<string>();
  avatarUrl = input<string | undefined>(undefined);
  caption = input<string | null>(null);
  profileLink = input.required<string | unknown[]>();

  readonly blocked = output<BlockedUser>();

  protected readonly open = signal(false);
  protected readonly toBlock = signal<BlockTarget | null>(null);

  protected readonly menuLabel = computed(() => `Opções para ${this.name()}`);

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected askToBlock(): void {
    this.close();
    this.toBlock.set({ kind: this.kind(), id: this.personId(), name: this.name() });
  }

  protected onBlocked(blocked: BlockedUser): void {
    this.toBlock.set(null);
    this.blocked.emit(blocked);
  }
}
