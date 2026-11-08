import { DatePipe } from '@angular/common';
import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import {
  ADMIN_ACTION_LABELS,
  APPEAL_STATUS_LABELS,
  AdminProfileDetail,
  BAN_APPEAL_LABELS,
  BAN_ENDING_LABELS,
  Ban,
  BLOCK_REASON_STATUS_LABELS,
  LateBlockReason,
  OCCURRENCE_REASON_LABELS,
  Occurrence,
  ReportConsequence,
  SwitchableRole,
} from '../../../core/models';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
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
import { revealFirstInvalid } from '../../../shared/ui/forms/invalid-field-focus.directive';
import { BanFieldsComponent } from '../../bans/ban-fields/ban-fields.component';
import { banDays, banType, buildBanForm, resetBanForm, validateBanForm } from '../../bans/ban-fields/ban-form';

type PageState = 'loading' | 'not-found' | 'error' | 'filled';
type Dialog =
  | { kind: 'add' }
  | { kind: 'annul'; occurrence: Occurrence }
  | { kind: 'appeal'; occurrence: Occurrence; annul: boolean }
  | { kind: 'blockReason'; reason: LateBlockReason; accept: boolean }
  | { kind: 'unblock'; blockId: string }
  | { kind: 'block' }
  | { kind: 'ban' }
  | { kind: 'unban'; ban: Ban }
  | { kind: 'banAppeal'; ban: Ban; accept: boolean };

@Component({
  selector: 'app-admin-profile-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    BackLinkComponent,
    BadgeComponent,
    BanFieldsComponent,
    ButtonComponent,
    ButtonGroupComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    JustificationDialogComponent,
    ReactiveFormsModule,
    SelectComponent,
    SkeletonListComponent,
  ],
  templateUrl: './admin-profile-detail.component.html',
  styleUrl: './admin-profile-detail.component.scss',
})
export class AdminProfileDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly profileService = inject(AdminProfileService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

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
  protected readonly blockReasonLabels = BLOCK_REASON_STATUS_LABELS;

  protected readonly roleLabel = this.role === 'patient' ? 'Paciente' : 'Profissional';
  private readonly blockedAction = this.role === 'patient' ? 'criar solicitações' : 'enviar propostas';
  protected readonly activeBlock = computed(() => this.detail()?.summary.block);

  protected readonly denialConsequence = new FormControl<ReportConsequence>('ocorrencia', { nonNullable: true });
  protected readonly denialOptions: SelectOption[] = [
    { value: 'ocorrencia', label: 'Manter como ocorrência' },
    { value: 'banimento', label: 'Banir' },
  ];
  private readonly denialValue = toSignal(this.denialConsequence.valueChanges, { initialValue: 'ocorrencia' as const });
  protected readonly askDenialConsequence = computed(() => {
    const dialog = this.dialog();
    return dialog?.kind === 'appeal' && !dialog.annul && dialog.occurrence.reason === 'denuncia_procedente';
  });

  protected readonly banForm = buildBanForm(this.fb);
  protected readonly banAppealLabels = BAN_APPEAL_LABELS;
  protected readonly banEndingLabels = BAN_ENDING_LABELS;
  protected readonly activeBan = computed(() => this.detail()?.bans.find((ban) => ban.active) ?? null);
  protected readonly pastBans = computed(() => this.detail()?.bans.filter((ban) => !ban.active) ?? []);
  protected readonly showBanFields = computed(
    () => this.dialog()?.kind === 'ban' || (this.askDenialConsequence() && this.denialValue() === 'banimento'),
  );

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
      case 'blockReason':
        return dialog.accept
          ? {
              title: 'Aceitar motivo',
              message: `Aceitar o motivo do bloqueio de ${dialog.reason.blockedName}?`,
              consequences: [
                'Nenhuma ocorrência é lançada por esse bloqueio.',
                'A pessoa recebe uma notificação com a justificativa.',
              ],
              confirm: 'Sim, aceitar o motivo',
              cancel: 'Não, voltar',
              variant: 'primary' as const,
            }
          : {
              title: 'Negar motivo',
              message: `Negar o motivo e lançar uma ocorrência para ${name}?`,
              consequences: [
                `A ocorrência conta como as outras: com ${detail.limit} em ${detail.windowDays} dias, o perfil fica bloqueado de ${this.blockedAction}.`,
                'Não cabe recurso: o motivo já foi analisado.',
                'A pessoa recebe uma notificação com a justificativa.',
              ],
              confirm: 'Sim, negar e lançar',
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
      case 'ban':
        return {
          title: 'Banir',
          message: `Banir o perfil de ${this.roleLabel.toLowerCase()} de ${name}?`,
          consequences: [
            'A pessoa continua entrando e consultando o histórico, mas não cria nem altera nada.',
            'Solicitações em curso, propostas pendentes e atendimentos agendados ou em andamento são encerrados, e a outra parte é avisada sem penalidade.',
            'Atendimentos que já terminaram, problemas em aberto e avaliações seguem normalmente.',
            'A pessoa recebe a notificação com a justificativa e pode recorrer uma vez.',
          ],
          confirm: 'Sim, banir',
          cancel: 'Não, voltar',
          variant: 'danger' as const,
        };
      case 'unban':
        return {
          title: 'Remover banimento',
          message: `Liberar o perfil de ${this.roleLabel.toLowerCase()} de ${name} agora?`,
          consequences: [
            'A pessoa volta a usar a plataforma normalmente.',
            'O que foi encerrado pelo banimento não volta.',
            'A pessoa recebe uma notificação com a justificativa.',
          ],
          confirm: 'Sim, remover o banimento',
          cancel: 'Não, manter o banimento',
          variant: 'primary' as const,
        };
      case 'banAppeal':
        return dialog.accept
          ? {
              title: 'Aceitar recurso',
              message: `Aceitar o recurso e desbanir ${name}?`,
              consequences: [
                'O banimento termina na hora e a pessoa volta a usar a plataforma.',
                'O que foi encerrado pelo banimento não volta.',
                'A pessoa recebe uma notificação com a justificativa.',
              ],
              confirm: 'Sim, aceitar o recurso',
              cancel: 'Não, voltar',
              variant: 'primary' as const,
            }
          : {
              title: 'Negar recurso',
              message: `Negar o recurso e manter o banimento de ${name}?`,
              consequences: ['O banimento continua; não cabe outro recurso.', 'A pessoa recebe uma notificação com a justificativa.'],
              confirm: 'Sim, negar o recurso',
              cancel: 'Não, voltar',
              variant: 'danger' as const,
            };
    }
  });

  protected openBan(): void {
    resetBanForm(this.banForm);
    this.dialog.set({ kind: 'ban' });
  }

  constructor() {
    this.load();
    this.denialConsequence.valueChanges.subscribe(() => resetBanForm(this.banForm));
    effect(() => {
      const dialog = this.dialog();
      untracked(() => {
        if (dialog?.kind === 'appeal') {
          this.denialConsequence.setValue('ocorrencia');
          resetBanForm(this.banForm);
        }
      });
    });
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
    if (this.showBanFields() && !validateBanForm(this.banForm)) {
      afterNextRender(() => revealFirstInvalid(this.host.nativeElement), { injector: this.injector });
      return;
    }
    const request$ = this.requestFor(dialog, justification);
    const success = {
      add: 'Ocorrência lançada.',
      annul: 'Ocorrência anulada.',
      appeal: 'Recurso decidido.',
      blockReason: 'Motivo do bloqueio decidido.',
      block: 'Bloqueio aplicado.',
      unblock: 'Bloqueio removido.',
      ban: 'Banimento aplicado.',
      unban: 'Banimento removido.',
      banAppeal: 'Recurso decidido.',
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

  private requestFor(dialog: Dialog, justification: string): Observable<AdminProfileDetail> {
    switch (dialog.kind) {
      case 'add':
        return this.profileService.addOccurrence(this.role, this.userId, justification);
      case 'annul':
        return this.profileService.annulOccurrence(dialog.occurrence.id, justification);
      case 'appeal':
        return this.profileService.decideAppeal(
          dialog.occurrence.appeal!.id,
          dialog.annul,
          justification,
          dialog.occurrence.reason === 'denuncia_procedente' ? this.denialConsequence.value : undefined,
          this.showBanFields() ? { type: banType(this.banForm), days: banDays(this.banForm) } : undefined,
        );
      case 'blockReason':
        return this.profileService.decideBlockReason(dialog.reason.id, dialog.accept, justification);
      case 'block':
        return this.profileService.applyBlock(this.role, this.userId, justification);
      case 'unblock':
        return this.profileService.removeBlock(dialog.blockId, justification);
      case 'ban':
        return this.profileService.ban(this.role, this.userId, {
          type: banType(this.banForm),
          days: banDays(this.banForm),
          bothProfiles: this.banForm.controls.bothProfiles.value,
          justification,
        });
      case 'unban':
        return this.profileService.removeBan(dialog.ban.id, justification);
      case 'banAppeal':
        return this.profileService.decideBanAppeal(dialog.ban.id, dialog.accept, justification);
    }
  }

  protected closeDialog(): void {
    if (!this.saving()) {
      this.dialog.set(null);
    }
  }
}
