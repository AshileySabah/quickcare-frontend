import { DatePipe } from '@angular/common';
import { Component, ElementRef, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatPeriod } from '../../../core/formatting/period';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import {
  ADMIN_ACTION_LABELS,
  APPEAL_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  REPORT_CONSEQUENCE_LABELS,
  REPORT_STATUS_LABELS,
  ReportConsequence,
  ReportDetail,
  StoredFile,
} from '../../../core/models';
import { AdminReportService } from '../../../core/services/admin/admin-report.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { BadgeComponent } from '../../../shared/ui/feedback/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { revealFirstInvalid } from '../../../shared/ui/forms/invalid-field-focus.directive';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { StoredFileComponent } from '../../../shared/ui/stored-file/stored-file.component';
import { REPORT_STATUS_VARIANTS } from '../reports/report-status';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

@Component({
  selector: 'app-admin-report-detail',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    BackLinkComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    JustificationDialogComponent,
    NoticeComponent,
    SelectComponent,
    SkeletonListComponent,
    StoredFileComponent,
  ],
  templateUrl: './admin-report-detail.component.html',
  styleUrl: './admin-report-detail.component.scss',
})
export class AdminReportDetailComponent {
  private readonly reportService = inject(AdminReportService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly backLink = '/admin/denuncias';
  protected readonly pageState = signal<PageState>('loading');
  protected readonly detail = signal<ReportDetail | null>(null);
  protected readonly saving = signal(false);
  protected readonly confirmingAnalysis = signal(false);
  protected readonly decisionOpen = signal(false);

  protected readonly period = formatPeriod;
  protected readonly statusLabels = REPORT_STATUS_LABELS;
  protected readonly statusVariants = REPORT_STATUS_VARIANTS;
  protected readonly consequenceLabels = REPORT_CONSEQUENCE_LABELS;
  protected readonly attendanceLabels = ATTENDANCE_STATUS_LABELS;
  protected readonly appealLabels = APPEAL_STATUS_LABELS;
  protected readonly actionLabels = ADMIN_ACTION_LABELS;

  protected readonly resultOptions: SelectOption[] = [
    { value: 'procedente', label: 'Procedente' },
    { value: 'improcedente', label: 'Improcedente' },
  ];
  protected readonly consequenceOptions: SelectOption[] = [
    { value: 'ocorrencia', label: 'Lançar ocorrência' },
    { value: 'banimento', label: 'Banir (disponível na etapa de banimento)', disabled: true },
  ];

  protected readonly form = this.fb.nonNullable.group({
    result: this.fb.nonNullable.control<'procedente' | 'improcedente' | ''>('', Validators.required),
    consequence: this.fb.nonNullable.control<ReportConsequence | ''>(''),
  });
  protected readonly fieldError = fieldErrorsFor(this.form, {
    result: { required: 'Escolha se a denúncia é procedente ou improcedente.' },
    consequence: { required: 'Escolha a consequência para o denunciado.' },
  });
  private readonly result = toSignal(this.form.controls.result.valueChanges, { initialValue: '' as const });
  protected readonly isProcedente = computed(() => this.result() === 'procedente');

  protected readonly pending = computed(() => {
    const status = this.detail()?.summary.status;
    return status === 'aberta' || status === 'em_analise';
  });

  protected readonly reportedName = computed(() => {
    const summary = this.detail()?.summary;
    if (!summary) {
      return '';
    }
    return summary.reporter === 'paciente' ? summary.professional.name : summary.patient.name;
  });

  protected readonly decisionConsequences = computed(() => {
    const items: string[] = [];
    if (this.isProcedente()) {
      items.push(`${this.reportedName()} recebe uma ocorrência e é avisado, sem saber quem denunciou.`);
      items.push('Quem foi denunciado pode recorrer uma vez; você decide o recurso na fila de Ocorrências.');
    } else {
      items.push(`${this.reportedName()} não é avisado da denúncia.`);
    }
    items.push('Quem denunciou recebe o resultado com a sua justificativa.');
    return items;
  });

  constructor() {
    this.load();
    this.form.controls.result.valueChanges.subscribe((value) => {
      const consequence = this.form.controls.consequence;
      consequence.setValidators(value === 'procedente' ? [Validators.required] : []);
      if (value !== 'procedente') {
        consequence.setValue('');
      }
      consequence.updateValueAndValidity();
    });
  }

  protected load(): void {
    this.pageState.set('loading');
    this.reportService.getById(this.id).subscribe({
      next: (detail) => {
        this.detail.set(detail ?? null);
        this.pageState.set(detail ? 'filled' : 'not-found');
      },
      error: () => this.pageState.set('error'),
    });
  }

  protected reporterLabel(detail: ReportDetail): string {
    return detail.summary.reporter === 'paciente' ? 'Paciente' : 'Profissional';
  }

  protected attachmentFile(detail: ReportDetail): StoredFile | null {
    return detail.attachment
      ? {
          fileName: detail.attachment.fileName,
          contentType: detail.attachment.contentType,
          sizeBytes: null,
          sentAt: detail.summary.createdAt,
          url: detail.attachment.url,
        }
      : null;
  }

  protected startAnalysis(): void {
    this.saving.set(true);
    this.reportService.startAnalysis(this.id).subscribe({
      next: (detail) => {
        this.saving.set(false);
        this.confirmingAnalysis.set(false);
        this.detail.set(detail);
        this.toastService.success('Análise iniciada.');
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected openDecision(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      afterNextRender(() => revealFirstInvalid(this.host.nativeElement), { injector: this.injector });
      return;
    }
    this.decisionOpen.set(true);
  }

  protected decide(justification: string): void {
    const { result, consequence } = this.form.getRawValue();
    if (!result) {
      return;
    }
    this.saving.set(true);
    this.reportService
      .decide(this.id, { result, consequence: consequence || undefined, justification })
      .subscribe({
        next: (detail) => {
          this.saving.set(false);
          this.decisionOpen.set(false);
          this.detail.set(detail);
          this.toastService.success('Decisão registrada.');
        },
        error: (error: Error) => {
          this.saving.set(false);
          this.toastService.error(error.message);
        },
      });
  }

  protected closeDecision(): void {
    if (!this.saving()) {
      this.decisionOpen.set(false);
    }
  }
}
