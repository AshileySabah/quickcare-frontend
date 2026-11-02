import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatPeriod } from '../../../core/formatting/period';
import {
  ADMIN_ACTION_LABELS,
  ADMIN_REQUEST_ACTION_LABELS,
  AdminRequestAction,
  AdminRequestDetail,
  formatRequestAddress,
} from '../../../core/models';
import { AdminRequestService } from '../../../core/services/admin/admin-request.service';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ButtonGroupComponent } from '../../../shared/ui/button-group/button-group.component';
import { ButtonComponent, ButtonVariant } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';

type PageState = 'loading' | 'not-found' | 'error' | 'filled';

interface ActionTexts {
  message: string;
  consequences: string[];
  confirm: string;
  variant: ButtonVariant;
}

const ACTION_TEXTS: Record<AdminRequestAction, ActionTexts> = {
  reabrir: {
    message: 'Reabrir esta solicitação?',
    consequences: [
      'Ela volta a ficar em curso; o status (aberta, recebendo propostas ou em andamento) sai das vagas preenchidas.',
      'O paciente recebe uma notificação com a justificativa.',
    ],
    confirm: 'Sim, reabrir a solicitação',
    variant: 'primary',
  },
  concluir: {
    message: 'Concluir esta solicitação?',
    consequences: [
      'Os atendimentos que ainda iam acontecer são cancelados, sem ocorrência para ninguém.',
      'As propostas pendentes são recusadas.',
      'Atendimentos com problema em aberto seguem pela fila de disputas.',
      'O paciente e os profissionais afetados recebem uma notificação com a justificativa.',
    ],
    confirm: 'Sim, concluir a solicitação',
    variant: 'primary',
  },
  cancelar: {
    message: 'Cancelar esta solicitação?',
    consequences: [
      'Os atendimentos que ainda iam acontecer são cancelados, sem ocorrência para ninguém.',
      'As propostas pendentes são recusadas.',
      'Atendimentos com problema em aberto seguem pela fila de disputas.',
      'O paciente e os profissionais afetados recebem uma notificação com a justificativa.',
    ],
    confirm: 'Sim, cancelar a solicitação',
    variant: 'danger',
  },
};

/** A solicitação no admin: dados, propostas com os atendimentos e a troca de status com justificativa. */
@Component({
  selector: 'app-admin-request-detail',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    BackLinkComponent,
    ButtonComponent,
    ButtonGroupComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    JustificationDialogComponent,
    SkeletonListComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './admin-request-detail.component.html',
  styleUrl: './admin-request-detail.component.scss',
})
export class AdminRequestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly requestService = inject(AdminRequestService);
  private readonly toastService = inject(ToastService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly backLink = '/admin/solicitacoes';
  protected readonly pageState = signal<PageState>('loading');
  protected readonly detail = signal<AdminRequestDetail | null>(null);
  protected readonly pendingAction = signal<AdminRequestAction | null>(null);
  protected readonly saving = signal(false);

  protected readonly actionLabels = ADMIN_REQUEST_ACTION_LABELS;
  protected readonly historyLabels = ADMIN_ACTION_LABELS;
  protected readonly period = formatPeriod;
  protected readonly address = formatRequestAddress;
  protected readonly texts = computed(() => {
    const action = this.pendingAction();
    return action ? ACTION_TEXTS[action] : null;
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.pageState.set('loading');
    this.requestService.getById(this.id).subscribe({
      next: (detail) => {
        if (!detail) {
          this.pageState.set('not-found');
          return;
        }
        this.detail.set(detail);
        this.pageState.set('filled');
      },
      error: () => this.pageState.set('error'),
    });
  }

  protected actionVariant(action: AdminRequestAction): ButtonVariant {
    return action === 'cancelar' ? 'danger-outline' : 'secondary';
  }

  protected confirm(justification: string): void {
    const action = this.pendingAction();
    if (!action) {
      return;
    }
    this.saving.set(true);
    this.requestService.changeStatus(this.id, action, justification).subscribe({
      next: (detail) => {
        this.saving.set(false);
        this.pendingAction.set(null);
        this.detail.set(detail);
        this.toastService.success('Status alterado. Os envolvidos foram avisados.');
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected closeDialog(): void {
    if (!this.saving()) {
      this.pendingAction.set(null);
    }
  }
}
