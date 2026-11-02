import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import {
  ADMIN_ACTION_LABELS,
  APPEAL_STATUS_LABELS,
  AdminProfileDetail,
  OCCURRENCE_REASON_LABELS,
  Occurrence,
  SwitchableRole,
} from '../../../core/models';
import { AdminProfileService } from '../../../core/services/admin/admin-profile.service';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ButtonGroupComponent } from '../../../shared/ui/button-group/button-group.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../shared/ui/feedback/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';

type PageState = 'loading' | 'not-found' | 'error' | 'filled';
type Dialog =
  | { kind: 'add' }
  | { kind: 'annul'; occurrence: Occurrence }
  | { kind: 'appeal'; occurrence: Occurrence; annul: boolean }
  | { kind: 'unblock'; blockId: string }
  | { kind: 'block' };

@Component({
  selector: 'app-admin-profile-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    BackLinkComponent,
    BadgeComponent,
    ButtonComponent,
    ButtonGroupComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    JustificationDialogComponent,
    SkeletonListComponent,
  ],
  templateUrl: './admin-profile-detail.component.html',
  styleUrl: './admin-profile-detail.component.scss',
})
export class AdminProfileDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly profileService = inject(AdminProfileService);
  private readonly toastService = inject(ToastService);

  private readonly role = this.route.snapshot.paramMap.get('perfil') as SwitchableRole;
  private readonly userId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly backLink = '/admin/ocorrencias';
  protected readonly pageState = signal<PageState>('loading');
  protected readonly detail = signal<AdminProfileDetail | null>(null);
  protected readonly dialog = signal<Dialog | null>(null);
  protected readonly saving = signal(false);
  protected readonly reasonLabels = OCCURRENCE_REASON_LABELS;
  protected readonly actionLabels = ADMIN_ACTION_LABELS;
  protected readonly appealLabels = APPEAL_STATUS_LABELS;

  protected readonly roleLabel = this.role === 'patient' ? 'Paciente' : 'Profissional';
  private readonly blockedAction = this.role === 'patient' ? 'criar solicitações' : 'enviar propostas';
  protected readonly activeBlock = computed(() => this.detail()?.summary.block);

  protected readonly dialogTexts = computed(() => {
    const dialog = this.dialog();
    const detail = this.detail();
    if (!dialog || !detail) {
      return null;
    }
    const name = detail.summary.name;
    switch (dialog.kind) {
      case 'add':
        return {
          title: 'Lançar ocorrência',
          message: `Lançar uma ocorrência para ${name}?`,
          consequences: [
            `Conta como as outras: com ${detail.limit} em ${detail.windowDays} dias, o perfil fica bloqueado de ${this.blockedAction}.`,
            'A pessoa recebe uma notificação com a justificativa.',
          ],
          confirm: 'Sim, lançar a ocorrência',
          cancel: 'Não, voltar',
          variant: 'danger' as const,
        };
      case 'annul':
        return {
          title: 'Anular ocorrência',
          message: `Anular a ocorrência "${this.reasonLabels[dialog.occurrence.reason]}"?`,
          consequences: [
            'Ela deixa de contar para o bloqueio.',
            'Se o bloqueio atual dependia dela (sem ela não chega a ' + detail.limit + '), ele é desfeito na hora.',
            'A pessoa recebe uma notificação com a justificativa.',
          ],
          confirm: 'Sim, anular a ocorrência',
          cancel: 'Não, manter a ocorrência',
          variant: 'primary' as const,
        };
      case 'appeal':
        return dialog.annul
          ? {
              title: 'Aceitar recurso',
              message: `Aceitar o recurso e anular a ocorrência "${this.reasonLabels[dialog.occurrence.reason]}"?`,
              consequences: [
                'A ocorrência deixa de contar e some do quadro da pessoa.',
                'Se o bloqueio atual dependia dela (sem ela não chega a ' + detail.limit + '), ele é desfeito na hora.',
                'A pessoa recebe uma notificação com a justificativa.',
              ],
              confirm: 'Sim, aceitar o recurso',
              cancel: 'Não, voltar',
              variant: 'primary' as const,
            }
          : {
              title: 'Negar recurso',
              message: `Negar o recurso e manter a ocorrência "${this.reasonLabels[dialog.occurrence.reason]}"?`,
              consequences: [
                'A ocorrência continua contando; não cabe outro recurso.',
                'A pessoa vê "Recurso negado" e recebe uma notificação com a justificativa.',
              ],
              confirm: 'Sim, negar o recurso',
              cancel: 'Não, voltar',
              variant: 'danger' as const,
            };
      case 'block':
        return {
          title: 'Aplicar bloqueio',
          message: `Bloquear ${name} de ${this.blockedAction}?`,
          consequences: [
            'Dura 7 dias × o próximo nível da pessoa (7, 14, 21...), como se ela chegasse a ' + detail.limit + ' ocorrências.',
            'Não depende das ocorrências: anular uma delas não o desfaz. Para liberar, remova o bloqueio.',
            'O que já está em andamento continua normalmente.',
            'A pessoa recebe uma notificação com a justificativa.',
          ],
          confirm: 'Sim, aplicar o bloqueio',
          cancel: 'Não, voltar',
          variant: 'danger' as const,
        };
      case 'unblock':
        return {
          title: 'Remover bloqueio',
          message: `Liberar ${name} para ${this.blockedAction} agora?`,
          consequences: [
            'O bloqueio termina na hora e as ocorrências que o causaram deixam de contar (ficam no histórico).',
            'A pessoa recebe uma notificação com a justificativa.',
          ],
          confirm: 'Sim, remover o bloqueio',
          cancel: 'Não, manter o bloqueio',
          variant: 'primary' as const,
        };
    }
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.pageState.set('loading');
    this.profileService.getById(this.role, this.userId).subscribe({
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

  protected confirm(justification: string): void {
    const dialog = this.dialog();
    if (!dialog) {
      return;
    }
    const request$: Observable<AdminProfileDetail> =
      dialog.kind === 'add'
        ? this.profileService.addOccurrence(this.role, this.userId, justification)
        : dialog.kind === 'annul'
          ? this.profileService.annulOccurrence(dialog.occurrence.id, justification)
          : dialog.kind === 'appeal'
            ? this.profileService.decideAppeal(dialog.occurrence.appeal!.id, dialog.annul, justification)
            : dialog.kind === 'block'
              ? this.profileService.applyBlock(this.role, this.userId, justification)
              : this.profileService.removeBlock(dialog.blockId, justification);
    const success = {
      add: 'Ocorrência lançada.',
      annul: 'Ocorrência anulada.',
      appeal: 'Recurso decidido.',
      block: 'Bloqueio aplicado.',
      unblock: 'Bloqueio removido.',
    }[dialog.kind];

    this.saving.set(true);
    request$.subscribe({
      next: (detail) => {
        this.saving.set(false);
        this.dialog.set(null);
        this.detail.set(detail);
        this.toastService.success(success);
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected closeDialog(): void {
    if (!this.saving()) {
      this.dialog.set(null);
    }
  }
}
