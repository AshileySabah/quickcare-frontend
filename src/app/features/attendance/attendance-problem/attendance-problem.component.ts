import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { formatDateTime } from '../../../core/formatting/period';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { Attendance, AttendanceSide, ProblemAttachment, ProblemReason } from '../../../core/models';
import { AttendanceService, AttendanceViewer, MAX_PROBLEM_ATTACHMENTS } from '../../../core/services/attendance.service';
import { ButtonGroupComponent } from '../../../shared/ui/button-group/button-group.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { MultiFilePickerComponent } from '../../../shared/ui/forms/multi-file-picker/multi-file-picker.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { TextareaComponent } from '../../../shared/ui/forms/textarea/textarea.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

type Dialog = 'report' | 'confirm' | 'contest';

const TEXT_ERRORS = {
  description: {
    minlength: 'Escreva pelo menos 10 caracteres.',
    maxlength: 'Use no máximo 2000 caracteres.',
  },
};

/**
 * "Não foi realizado": relatar (com até 3 anexos), e o outro lado confirmar
 * ou contestar em 7 dias. Sem resposta, vale o relato, mas ainda dá para
 * contestar; contestado, um administrador decide. Fica dentro do painel do
 * atendimento.
 */
@Component({
  selector: 'app-attendance-problem',
  standalone: true,
  imports: [InvalidFieldFocusDirective, 
    ReactiveFormsModule,
    ButtonComponent,
    ButtonGroupComponent,
    ConfirmDialogComponent,
    IconComponent,
    MultiFilePickerComponent,
    NoticeComponent,
    SelectComponent,
    TextareaComponent,
  ],
  templateUrl: './attendance-problem.component.html',
  styleUrl: './attendance-problem.component.scss',
})
export class AttendanceProblemComponent {
  private readonly fb = inject(FormBuilder);
  private readonly attendanceService = inject(AttendanceService);
  private readonly toastService = inject(ToastService);

  attendance = input.required<Attendance>();
  viewer = input.required<AttendanceViewer>();
  counterpartName = input<string | undefined>(undefined);

  readonly changed = output<Attendance>();

  protected readonly maxFiles = MAX_PROBLEM_ATTACHMENTS;
  protected readonly dialog = signal<Dialog | null>(null);
  protected readonly loading = signal(false);
  protected readonly openingAttachment = signal<string | null>(null);
  private files: File[] = [];

  protected readonly reportForm = this.fb.nonNullable.group({
    reason: this.fb.nonNullable.control<ProblemReason | ''>('', Validators.required),
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });
  protected readonly contestForm = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });
  protected readonly reportError = fieldErrorsFor(this.reportForm, TEXT_ERRORS);
  private readonly chosenReason = toSignal(this.reportForm.controls.reason.valueChanges, { initialValue: '' });
  protected readonly contestError = fieldErrorsFor(this.contestForm, TEXT_ERRORS);

  protected readonly problem = computed(() => this.attendance().problem);
  private readonly mySide = computed<AttendanceSide>(() => (this.viewer() === 'patient' ? 'paciente' : 'profissional'));
  protected readonly reportedByMe = computed(() => this.problem()?.reportedBy === this.mySide());
  protected readonly canAnswer = computed(() =>
    this.attendanceService.canAnswerProblem(this.attendance(), this.viewer()),
  );
  protected readonly canContest = computed(() =>
    this.attendanceService.canContestProblem(this.attendance(), this.viewer()),
  );

  /** "Carla Mendes" para o paciente; "O paciente" para o profissional. */
  private readonly other = computed(() =>
    this.viewer() === 'patient' ? (this.counterpartName() ?? 'O profissional') : 'O paciente',
  );
  private readonly otherLower = computed(() => (this.viewer() === 'patient' ? this.other() : 'o paciente'));

  protected readonly reasonOptions = computed<SelectOption[]>(() => [
    { value: 'outro_nao_compareceu', label: `${this.other()} não compareceu` },
    { value: 'combinado', label: 'Combinamos de não fazer' },
  ]);

  protected readonly reportConsequences = computed(() => {
    const items = [`${this.other()} tem 7 dias para confirmar ou contestar.`];
    items.push(
      this.chosenReason() === 'combinado'
        ? 'Confirmado (ou sem resposta), o atendimento fica como não realizado, sem ocorrência para ninguém.'
        : `Confirmado (ou sem resposta), o atendimento fica como não realizado e conta uma ocorrência para ${this.otherLower()}.`,
    );
    items.push('Se houver contestação, um administrador analisa as duas versões e decide.');
    return items;
  });

  protected readonly confirmConsequences = computed(() => [
    'O atendimento fica como não realizado.',
    this.problem()?.reason === 'outro_nao_compareceu'
      ? 'Como o relato diz que você não compareceu, conta uma ocorrência para você.'
      : 'Foi combinado entre vocês: ninguém leva ocorrência.',
  ]);

  /** A frase sobre em que pé o relato está, para quem vê. */
  protected readonly statusText = computed(() => {
    const problem = this.problem();
    if (!problem) {
      return null;
    }
    const deadline = formatDateTime(problem.answerDeadline);
    switch (problem.status) {
      case 'aguardando_resposta':
        return this.reportedByMe()
          ? `Aguardando ${this.otherLower()} responder até ${deadline}. Sem resposta, vale o seu relato.`
          : `Responda até ${deadline}: confirme ou conteste. Sem resposta, o atendimento fica como não realizado` +
              (problem.reason === 'outro_nao_compareceu' ? ' e conta uma ocorrência para você.' : '.');
      case 'confirmado':
        return 'Confirmado pelos dois lados: o atendimento ficou como não realizado.';
      case 'sem_resposta':
        return this.reportedByMe()
          ? 'Sem resposta no prazo: o atendimento ficou como não realizado.'
          : 'Sem resposta no prazo: o atendimento ficou como não realizado. Se discordar, você ainda pode contestar com o administrador.';
      case 'em_disputa':
        return 'Contestado: um administrador está analisando as duas versões.';
      case 'decidido':
        return (
          `Um administrador decidiu que o atendimento ${problem.decision === 'realizado' ? 'foi' : 'não foi'} realizado. ` +
          `Justificativa: ${problem.decisionJustification ?? ''}`
        );
    }
  });

  protected readonly reportAttachments = computed(() => this.attachmentsOf(this.problem()?.reportedBy));
  protected readonly contestAttachments = computed(() => {
    const problem = this.problem();
    return problem ? this.attachmentsOf(problem.reportedBy === 'paciente' ? 'profissional' : 'paciente') : [];
  });

  protected authorOf(side: AttendanceSide | undefined): string {
    return side === this.mySide() ? 'Você' : this.other();
  }

  protected reasonLabel(reason: ProblemReason): string {
    return reason === 'combinado' ? 'Combinaram de não fazer' : 'Não compareceu';
  }

  protected openReport(): void {
    this.reportForm.reset({ reason: '', description: '' });
    this.files = [];
    this.dialog.set('report');
  }

  protected openContest(): void {
    this.contestForm.reset({ description: '' });
    this.files = [];
    this.dialog.set('contest');
  }

  protected setFiles(files: File[]): void {
    this.files = files;
  }

  protected submitReport(): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }
    const { reason, description } = this.reportForm.getRawValue();
    this.run(
      this.attendanceService.reportProblem(this.attendance().id, {
        reason: reason as ProblemReason,
        description,
        files: this.files,
      }),
      'Relato enviado.',
    );
  }

  protected confirm(): void {
    this.run(this.attendanceService.confirmProblem(this.attendance().id), 'Você confirmou que não foi realizado.');
  }

  protected submitContest(): void {
    if (this.contestForm.invalid) {
      this.contestForm.markAllAsTouched();
      return;
    }
    this.run(
      this.attendanceService.contestProblem(this.attendance().id, {
        description: this.contestForm.getRawValue().description,
        files: this.files,
      }),
      'Contestação enviada. Um administrador vai analisar.',
    );
  }

  protected openAttachment(attachment: ProblemAttachment): void {
    this.openingAttachment.set(attachment.id);
    this.attendanceService.attachmentUrl(this.attendance().id, attachment.id).subscribe({
      next: (url) => {
        this.openingAttachment.set(null);
        window.open(url, '_blank', 'noopener');
      },
      error: (error: Error) => {
        this.openingAttachment.set(null);
        this.toastService.error(error.message);
      },
    });
  }

  protected closeDialog(): void {
    if (!this.loading()) {
      this.dialog.set(null);
    }
  }

  private attachmentsOf(side: AttendanceSide | undefined): ProblemAttachment[] {
    return this.problem()?.attachments.filter((attachment) => attachment.side === side) ?? [];
  }

  private run(request$: Observable<Attendance>, success: string): void {
    this.loading.set(true);
    request$.subscribe({
      next: (attendance) => {
        this.loading.set(false);
        this.dialog.set(null);
        this.toastService.success(success);
        this.changed.emit(attendance);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
