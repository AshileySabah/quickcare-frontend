import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlockedUser, ListViewState, SwitchableRole } from '../../../core/models';
import { UserBlockService } from '../../../core/services/user-block.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { PersonChipComponent } from '../../../shared/ui/person-chip/person-chip.component';
import { createPagination } from '../../../core/lists/pagination';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';
import { UnblockTarget, UnblockUserDialogComponent } from '../unblock-user-dialog/unblock-user-dialog.component';

@Component({
  selector: 'app-blocked-users',
  standalone: true,
  imports: [
    PaginatorComponent,
    DatePipe,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PersonChipComponent,
    SkeletonListComponent,
    UnblockUserDialogComponent,
  ],
  templateUrl: './blocked-users.component.html',
  styleUrl: './blocked-users.component.scss',
})
export class BlockedUsersComponent implements OnInit {
  private readonly userBlockService = inject(UserBlockService);
  private readonly routeRole: SwitchableRole | undefined = inject(ActivatedRoute).snapshot.data['role'];

  role = input<SwitchableRole | undefined>(undefined);

  protected readonly activeRole = computed<SwitchableRole>(() => this.role() ?? this.routeRole ?? 'patient');
  protected readonly emptyMessage = computed(() =>
    this.activeRole() === 'patient'
      ? 'Para bloquear um profissional, clique no nome dele numa proposta ou abra o perfil dele.'
      : 'Para bloquear um paciente, clique no nome dele numa proposta aceita ou abra o perfil dele.',
  );

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly blocked = signal<BlockedUser[]>([]);
  protected readonly pager = createPagination(this.blocked);
  protected readonly toUnblock = signal<UnblockTarget | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.userBlockService.list(this.activeRole()).subscribe({
      next: (blocked) => {
        this.blocked.set(blocked);
        this.viewState.set(blocked.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected onUnblocked(blockId: string): void {
    this.toUnblock.set(null);
    this.blocked.update((list) => list.filter((item) => item.id !== blockId));
    if (this.blocked().length === 0) {
      this.viewState.set('empty');
    }
  }
}
