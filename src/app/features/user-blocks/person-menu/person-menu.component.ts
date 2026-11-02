import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlockTarget, BlockTargetKind, BlockedUser } from '../../../core/models';
import { DismissibleDirective } from '../../../shared/ui/dismissible/dismissible.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PersonChipComponent } from '../../../shared/ui/person-chip/person-chip.component';
import { BlockUserDialogComponent } from '../block-user-dialog/block-user-dialog.component';

/**
 * Avatar e nome da outra parte (numa proposta ou solicitação). O clique abre
 * o menu "Ver perfil" / "Bloquear"; bloquear confirma num modal e avisa a
 * tela (`blocked`), que recarrega o que mudou.
 */
@Component({
  selector: 'app-person-menu',
  standalone: true,
  imports: [RouterLink, BlockUserDialogComponent, DismissibleDirective, IconComponent, PersonChipComponent],
  templateUrl: './person-menu.component.html',
  styleUrl: './person-menu.component.scss',
})
export class PersonMenuComponent {
  /** Profissional (quem vê é o paciente) ou paciente (quem vê é o profissional). */
  kind = input.required<BlockTargetKind>();
  /** Id do perfil da pessoa. */
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
