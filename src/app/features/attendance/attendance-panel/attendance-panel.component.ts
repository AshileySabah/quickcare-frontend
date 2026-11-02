import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { formatPeriod } from '../../../core/formatting/period';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { PERIOD_ERROR_MESSAGES, buildPeriodControls, fromLocalInputValue, toLocalInputValue } from '../../../core/forms/period-form';
import { Attendance, cancellationDescription } from '../../../core/models';
import { AttendanceService, AttendanceViewer } from '../../../core/services/attendance.service';
import { ButtonGroupComponent } from '../../../shared/ui/button-group/button-group.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { AttendanceProblemComponent } from '../attendance-problem/attendance-problem.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

type PendingAction = 'reaccept' | 'decline-reaccept' | 'accept-reschedule' | 'decline-reschedule' | 'reschedule' | 'cancel';

/**
 * O atendimento de uma proposta aceita, do ponto de vista de quem vê:
 * status e período, a remarcação pendente (responder ou aguardar), o reaceite
 * depois que o paciente editou, as ações de remarcar e cancelar e o relato
 * de "não foi realizado". O atendimento muda de estado sozinho no horário:
 * não há iniciar nem finalizar.
 */
@Component({
  selector: 'app-attendance-panel',
  standalone: true,
  imports: [InvalidFieldFocusDirective, 
    ReactiveFormsModule,
    AttendanceProblemComponent,
    ButtonComponent,
    ButtonGroupComponent,
    ConfirmDialogComponent,
    IconComponent,
    InputComponent,
    NoticeComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './attendance-panel.component.html',
  styleUrl: './attendance-panel.component.scss',
})
export class AttendancePanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly attendanceService = inject(AttendanceService);
  private readonly toastService = inject(ToastService);

  attendance = input.required<Attendance>();
  viewer = input.required<AttendanceViewer>();
  /** Nome da outra parte, quando ela já é revelada (o paciente vê o do profissional). */
  counterpartName = input<string | undefined>(undefined);

  /** O atendimento depois da ação; quem usa recarrega a proposta. */
  readonly changed = output<Attendance>();

  protected readonly pending = signal<PendingAction | null>(null);
  protected readonly dialog = signal<'cancel' | 'decline-reaccept' | 'reschedule' | null>(null);

  protected readonly rescheduleForm = this.fb.nonNullable.group(buildPeriodControls(this.fb));
  protected readonly rescheduleError = fieldErrorsFor(this.rescheduleForm, PERIOD_ERROR_MESSAGES);

  protected readonly period = computed(() => formatPeriod(this.attendance().start, this.attendance().end));
  protected readonly cancellation = computed(() => cancellationDescription(this.attendance()));
  protected readonly canChange = computed(() => this.attendanceService.canChange(this.attendance()));
  protected readonly canReaccept = computed(() => this.attendanceService.canReaccept(this.attendance(), this.viewer()));
  protected readonly canAnswerReschedule = computed(() =>
    this.attendanceService.canAnswerReschedule(this.attendance(), this.viewer()),
  );
  protected readonly started = computed(() => this.attendance().status === 'em_andamento');

  private readonly otherSide = computed(() =>
    this.viewer() === 'patient' ? (this.counterpartName() ?? 'O profissional') : 'O paciente',
  );

  protected readonly rescheduleNotice = computed(() => {
    const reschedule = this.attendance().reschedule;
    if (!reschedule) {
      return null;
    }
    const proposed = formatPeriod(reschedule.start, reschedule.end);
    return this.canAnswerReschedule()
      ? `${this.otherSide()} pediu para remarcar para ${proposed}. Se recusar, continua no horário atual.`
      : `Você pediu para remarcar para ${proposed}. Aguardando a resposta.`;
  });

  protected readonly reacceptNotice = computed(() => {
    if (this.attendance().status !== 'aguardando_reaceite') {
      return null;
    }
    if (this.viewer() === 'professional') {
      return (
        'O paciente alterou a solicitação depois de aceitar a sua proposta. Reaceite para manter o atendimento ' +
        'ou recuse a nova versão (sem penalidade). Sem resposta até o início, o atendimento é cancelado.'
      );
    }
    const late = this.attendance().lateChange
      ? ' Como falta menos de 48h para o atendimento, trocar de profissional conta como ocorrência para você.'
      : '';
    return (
      `Aguardando ${this.counterpartName() ?? 'o profissional'} reaceitar a nova versão da solicitação. ` +
      `Enquanto isso, você pode aceitar outra proposta para esta vaga.${late}`
    );
  });

  protected readonly cancelConsequences = computed(() => [
    'O atendimento é cancelado e a vaga volta a receber propostas.',
    `${this.otherSide()} é avisado.`,
    this.attendance().cancellationCountsAsOccurrence
      ? 'Já passaram 48h do aceite, então isso conta como uma ocorrência para você.'
      : 'Ainda está dentro da tolerância de 48h do aceite: não conta como ocorrência.',
  ]);

  protected readonly declineReacceptConsequences = [
    'O atendimento é cancelado e a vaga volta a receber propostas.',
    'Recusar a nova versão não conta como ocorrência para você.',
    'A proposta vai para o histórico.',
  ];

  protected openReschedule(): void {
    const attendance = this.attendance();
    this.rescheduleForm.reset({ start: toLocalInputValue(attendance.start), end: toLocalInputValue(attendance.end) });
    // Já começou: só o término muda.
    if (this.started()) {
      this.rescheduleForm.controls.start.disable();
    } else {
      this.rescheduleForm.controls.start.enable();
    }
    this.dialog.set('reschedule');
  }

  protected confirmReschedule(): void {
    if (this.rescheduleForm.invalid) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }
    const { start, end } = this.rescheduleForm.getRawValue();
    this.run('reschedule', this.attendanceService.requestReschedule(this.attendance().id, {
      start: this.started() ? this.attendance().start : fromLocalInputValue(start),
      end: fromLocalInputValue(end),
    }), 'Pedido de remarcação enviado.');
  }

  protected reaccept(): void {
    this.run('reaccept', this.attendanceService.reaccept(this.attendance().id), 'Você reaceitou a nova versão.');
  }

  protected declineReaccept(): void {
    this.run('decline-reaccept', this.attendanceService.declineReaccept(this.attendance().id), 'Nova versão recusada.');
  }

  protected acceptReschedule(): void {
    this.run('accept-reschedule', this.attendanceService.acceptReschedule(this.attendance().id), 'Remarcação aceita.');
  }

  protected declineReschedule(): void {
    this.run('decline-reschedule', this.attendanceService.declineReschedule(this.attendance().id), 'Remarcação recusada.');
  }

  protected cancel(): void {
    this.run('cancel', this.attendanceService.cancel(this.attendance().id), 'Atendimento cancelado.');
  }

  protected closeDialog(): void {
    if (!this.pending()) {
      this.dialog.set(null);
    }
  }

  private run(action: PendingAction, request$: Observable<Attendance>, success: string): void {
    this.pending.set(action);
    request$.subscribe({
      next: (attendance) => {
        this.pending.set(null);
        this.dialog.set(null);
        this.toastService.success(success);
        this.changed.emit(attendance);
      },
      error: (error: Error) => {
        this.pending.set(null);
        this.toastService.error(error.message);
      },
    });
  }
}
