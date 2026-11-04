import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatPeriod } from '../../../core/formatting/period';
import {
  ADMIN_ACTION_LABELS,
  ATTENDANCE_STATUS_LABELS,
  AttendanceSide,
  DisputeDetail,
  ProblemAttachment,
  ProblemDecision,
  StoredFile,
} from '../../../core/models';
import { AdminDisputeService } from '../../../core/services/admin/admin-dispute.service';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { CheckboxComponent } from '../../../shared/ui/forms/checkbox/checkbox.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { StoredFileComponent } from '../../../shared/ui/stored-file/stored-file.component';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

type PageState = 'loading' | 'not-found' | 'error' | 'filled';

const EVENT_LABELS: Record<string, string> = {
  AGENDADO: 'Proposta aceita: atendimento agendado',
  REACEITE_SOLICITADO: 'Paciente editou a solicitação: aguardando reaceite',
  REACEITO: 'Profissional reaceitou',
  REMARCACAO_SOLICITADA: 'Remarcação pedida',
  REMARCACAO_ACEITA: 'Remarcação aceita',
  REMARCACAO_RECUSADA: 'Remarcação recusada',
  REMARCACAO_EXPIRADA: 'Remarcação expirou sem resposta',
  INICIADO: 'Atendimento começou',
  FINALIZADO: 'Atendimento terminou',
  CONCLUIDO: 'Atendimento concluído',
  CANCELADO: 'Atendimento cancelado',
  PROBLEMA_RELATADO: 'Relatado como não realizado',
  PROBLEMA_CONFIRMADO: 'Não realização confirmada',
  PROBLEMA_SEM_RESPOSTA: 'Prazo de resposta venceu',
  PROBLEMA_CONTESTADO: 'Relato contestado',
  DISPUTA_DECIDIDA: 'Disputa decidida',
};

const DECISION_OPTIONS: SelectOption[] = [
  { value: 'nao_realizado', label: 'Não foi realizado' },
  { value: 'realizado', label: 'Foi realizado' },
];

@Component({
  selector: 'app-admin-dispute-detail',
  standalone: true,
  imports: [InvalidFieldFocusDirective, 
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    BackLinkComponent,
    ButtonComponent,
    CardComponent,
    CheckboxComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    JustificationDialogComponent,
    NoticeComponent,
    SelectComponent,
    SkeletonListComponent,
    StatusBadgeComponent,
    StoredFileComponent,
  ],
  templateUrl: './admin-dispute-detail.component.html',
  styleUrl: './admin-dispute-detail.component.scss',
})
export class AdminDisputeDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly disputeService = inject(AdminDisputeService);
  private readonly toastService = inject(ToastService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly backLink = '/admin/disputas';
  protected readonly pageState = signal<PageState>('loading');
  protected readonly detail = signal<DisputeDetail | null>(null);
  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);

  protected readonly decisionOptions = DECISION_OPTIONS;
  protected readonly statusLabels = ATTENDANCE_STATUS_LABELS;
  protected readonly actionLabels = ADMIN_ACTION_LABELS;
  protected readonly period = formatPeriod;

  protected readonly form = this.fb.nonNullable.group({
    decision: this.fb.nonNullable.control<ProblemDecision>('nao_realizado'),
    patientOccurrence: false,
    professionalOccurrence: false,
  });
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly open = computed(() => this.detail()?.problem.status === 'em_disputa');

  protected readonly decisionConsequences = computed(() => {
    const value = this.formValue();
    const items = [
      value.decision === 'realizado'
        ? 'O atendimento volta a contar como realizado.'
        : 'O atendimento fica como não realizado (a vaga não reabre depois do término).',
      'As ocorrências que o relato tinha gerado são anuladas e trocadas pelas desta decisão.',
    ];
    const who = [value.patientOccurrence && 'o paciente', value.professionalOccurrence && 'o profissional'].filter(Boolean);
    items.push(who.length ? `Leva ocorrência: ${who.join(' e ')}.` : 'Ninguém leva ocorrência.');
    items.push('Os dois lados são avisados, com a justificativa.');
    return items;
  });

  constructor() {
    this.form.controls.decision.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.suggest());
    this.load();
  }

  protected load(): void {
    this.pageState.set('loading');
    this.disputeService.getById(this.id).subscribe({
      next: (detail) => {
        if (!detail) {
          this.pageState.set('not-found');
          return;
        }
        this.show(detail);
      },
      error: () => this.pageState.set('error'),
    });
  }

  protected sideLabel(side: AttendanceSide, detail: DisputeDetail): string {
    return side === 'paciente'
      ? `${detail.summary.patient.name} (paciente)`
      : `${detail.summary.professional.name} (profissional)`;
  }

  protected contestingSide(detail: DisputeDetail): AttendanceSide {
    return detail.problem.reportedBy === 'paciente' ? 'profissional' : 'paciente';
  }

  protected attachments(detail: DisputeDetail, side: AttendanceSide): StoredFile[] {
    return detail.problem.attachments.filter((attachment) => attachment.side === side).map(toStoredFile);
  }

  protected eventLabel(type: string): string {
    return EVENT_LABELS[type] ?? type;
  }

  private suggest(): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    const absent = detail.problem.reason === 'outro_nao_compareceu' ? this.contestingSide(detail) : null;
    const notRealized = this.form.controls.decision.value === 'nao_realizado';
    this.form.patchValue({
      patientOccurrence: notRealized && absent === 'paciente',
      professionalOccurrence: notRealized && absent === 'profissional',
    });
  }

  protected decide(justification: string): void {
    const { decision, patientOccurrence, professionalOccurrence } = this.form.getRawValue();
    const occurrenceFor: AttendanceSide[] = [];
    if (patientOccurrence) {
      occurrenceFor.push('paciente');
    }
    if (professionalOccurrence) {
      occurrenceFor.push('profissional');
    }

    this.saving.set(true);
    this.disputeService.decide(this.id, { decision, occurrenceFor, justification }).subscribe({
      next: (detail) => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.toastService.success('Decisão registrada. Os dois lados foram avisados.');
        this.show(detail);
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected closeDialog(): void {
    if (!this.saving()) {
      this.dialogOpen.set(false);
    }
  }

  private show(detail: DisputeDetail): void {
    this.detail.set(detail);
    this.pageState.set('filled');
    this.suggest();
  }
}

function toStoredFile(attachment: ProblemAttachment): StoredFile {
  return { fileName: attachment.fileName, contentType: attachment.contentType, sizeBytes: null, sentAt: null, url: attachment.url ?? null };
}
