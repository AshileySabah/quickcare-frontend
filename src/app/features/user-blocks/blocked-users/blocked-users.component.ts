import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlockedUser, ListViewState, SwitchableRole } from '../../../core/models';
import { UserBlockService } from '../../../core/services/user-block.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { PersonChipComponent } from '../../../shared/ui/person-chip/person-chip.component';
import { createPagination } from '../../../core/lists/pagination';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';

@Component({
  selector: 'app-blocked-users',
  standalone: true,
  imports: [PaginatorComponent, 
    DatePipe,
    ButtonComponent,
    CardComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PersonChipComponent,
    SkeletonListComponent,
  ],
  templateUrl: './blocked-users.component.html',
  styleUrl: './blocked-users.component.scss',
})
export class BlockedUsersComponent {
  private readonly userBlockService = inject(UserBlockService);
  private readonly toastService = inject(ToastService);

  protected readonly role: SwitchableRole = inject(ActivatedRoute).snapshot.data['role'];
  protected readonly emptyMessage =
    this.role === 'patient'
      ? 'Para bloquear um profissional, clique no nome dele numa proposta ou abra o perfil dele.'
      : 'Para bloquear um paciente, clique no nome dele numa proposta aceita ou abra o perfil dele.';

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly blocked = signal<BlockedUser[]>([]);
  protected readonly pager = createPagination(this.blocked);
  protected readonly toUnblock = signal<BlockedUser | null>(null);
  protected readonly isUnblocking = signal(false);

  protected readonly unblockConsequences = [
    'Vocês voltam a poder trocar solicitações e propostas.',
    'O que foi encerrado no bloqueio não volta.',
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.userBlockService.list(this.role).subscribe({
      next: (blocked) => {
        this.blocked.set(blocked);
        this.viewState.set(blocked.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected confirmUnblock(): void {
    const user = this.toUnblock();
    if (!user) {
      return;
    }
    this.isUnblocking.set(true);
    this.userBlockService.unblock(user.id).subscribe({
      next: () => {
        this.isUnblocking.set(false);
        this.toUnblock.set(null);
        this.toastService.success(`Você desbloqueou ${user.name}.`);
        this.blocked.update((list) => list.filter((item) => item.id !== user.id));
        if (this.blocked().length === 0) {
          this.viewState.set('empty');
        }
      },
      error: (error: Error) => {
        this.isUnblocking.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
