import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminProfileSummary, AdminUserBlock, ListViewState, USER_BLOCK_AUTHOR_LABELS } from '../../../core/models';
import { AdminUserBlockService } from '../../../core/services/admin/admin-user-block.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../shared/ui/feedback/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { AdminPersonPickerComponent } from '../person-picker/admin-person-picker.component';
import { createPagination } from '../../../core/lists/pagination';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';

/**
 * Gerais › Bloqueios entre usuários: todos (de quem quer que tenha
 * bloqueado), bloquear um paciente e um profissional entre si e remover
 * qualquer um, com justificativa. O bloqueio do admin não aparece para os dois
 * e só o admin desfaz.
 */
@Component({
  selector: 'app-admin-user-blocks',
  standalone: true,
  imports: [PaginatorComponent, 
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    AdminPersonPickerComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    InputComponent,
    JustificationDialogComponent,
    SkeletonListComponent,
  ],
  templateUrl: './admin-user-blocks.component.html',
  styleUrl: './admin-user-blocks.component.scss',
})
export class AdminUserBlocksComponent {
  private readonly userBlockService = inject(AdminUserBlockService);
  private readonly toastService = inject(ToastService);

  protected readonly authorLabels = USER_BLOCK_AUTHOR_LABELS;
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly blocks = signal<AdminUserBlock[]>([]);
  /** A lista vem paginada (5 por página por padrão). */
  protected readonly pager = createPagination(this.blocks);

  protected readonly creating = signal(false);
  protected readonly patient = signal<AdminProfileSummary | null>(null);
  protected readonly professional = signal<AdminProfileSummary | null>(null);
  /** Só aparece depois de tentar confirmar sem escolher. */
  protected readonly showPickerErrors = signal(false);
  protected readonly toRemove = signal<AdminUserBlock | null>(null);
  protected readonly saving = signal(false);

  protected readonly createConsequences = [
    'O profissional deixa de ver as solicitações do paciente e não pode mais enviar propostas para ele.',
    'Propostas pendentes e atendimentos em curso entre os dois são encerrados, sem ocorrência para ninguém.',
    'Os dois recebem um aviso neutro, sem menção ao bloqueio; ele não aparece na lista deles e só o admin desfaz.',
  ];
  protected readonly removeConsequences = [
    'Os dois voltam a poder trocar solicitações e propostas.',
    'O que foi encerrado no bloqueio não volta.',
  ];

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load());
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.userBlockService.list(this.search.value).subscribe({
      next: (blocks) => {
        this.blocks.set(blocks);
        this.viewState.set(blocks.length ? 'filled' : 'empty');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected openCreate(): void {
    this.patient.set(null);
    this.professional.set(null);
    this.showPickerErrors.set(false);
    this.creating.set(true);
  }

  protected confirmCreate(justification: string): void {
    const patient = this.patient();
    const professional = this.professional();
    if (!patient || !professional) {
      this.showPickerErrors.set(true);
      return;
    }
    this.saving.set(true);
    this.userBlockService.block(patient.userId, professional.userId, justification).subscribe({
      next: () => {
        this.saving.set(false);
        this.creating.set(false);
        this.toastService.success(`${patient.name} e ${professional.name} foram bloqueados entre si.`);
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected confirmRemove(justification: string): void {
    const block = this.toRemove();
    if (!block) {
      return;
    }
    this.saving.set(true);
    this.userBlockService.remove(block.id, justification).subscribe({
      next: () => {
        this.saving.set(false);
        this.toRemove.set(null);
        this.toastService.success('Bloqueio removido.');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected closeCreate(): void {
    if (!this.saving()) {
      this.creating.set(false);
    }
  }

  protected closeRemove(): void {
    if (!this.saving()) {
      this.toRemove.set(null);
    }
  }
}
