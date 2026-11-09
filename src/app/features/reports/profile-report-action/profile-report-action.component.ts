import { Component, computed, inject, input, output, signal } from '@angular/core';
import { BlockTarget, ReportInput, ReportTargetKind } from '../../../core/models';
import { ReportService } from '../../../core/services/report.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { BlockUserDialogComponent } from '../../user-blocks/block-user-dialog/block-user-dialog.component';
import { ReportDialogComponent, ReportTarget } from '../report-dialog/report-dialog.component';

@Component({
  selector: 'app-profile-report-action',
  standalone: true,
  imports: [BlockUserDialogComponent, ButtonComponent, ConfirmDialogComponent, IconComponent, ReportDialogComponent],
  template: `
    <ui-button variant="warning-outline" size="sm" [disabled]="pending()" (click)="askToReport()">
      <ui-icon name="alert"></ui-icon>
      {{ pending() ? 'Denúncia em andamento' : 'Denunciar' }}
    </ui-button>

    <app-report-dialog
      [target]="toReport()"
      [loading]="isSending()"
      (submitted)="send($event)"
      (closed)="closeReport()"
    ></app-report-dialog>

    <ui-confirm-dialog
      [open]="askingToBlock()"
      titleText="Bloquear também?"
      icon="ban"
      [message]="'Denúncia enviada. Quer bloquear ' + name() + ' também?'"
      [consequences]="blockHint()"
      [confirmLabel]="'Sim, bloquear ' + noun()"
      [cancelLabel]="'Não, só denunciar'"
      confirmVariant="danger"
      (confirmed)="openBlock()"
      (closed)="askingToBlock.set(false)"
    ></ui-confirm-dialog>

    <app-block-user-dialog
      [target]="toBlock()"
      (blocked)="onBlocked()"
      (closed)="toBlock.set(null)"
    ></app-block-user-dialog>
  `,
})
export class ProfileReportActionComponent {
  private readonly reportService = inject(ReportService);
  private readonly toastService = inject(ToastService);

  kind = input.required<ReportTargetKind>();
  personId = input.required<string>();
  name = input.required<string>();
  inProgress = input(false);

  readonly blocked = output<void>();

  protected readonly reported = signal(false);
  protected readonly pending = computed(() => this.inProgress() || this.reported());
  protected readonly toReport = signal<ReportTarget | null>(null);
  protected readonly isSending = signal(false);
  protected readonly askingToBlock = signal(false);
  protected readonly toBlock = signal<BlockTarget | null>(null);

  protected readonly noun = computed(() => (this.kind() === 'patient' ? 'o paciente' : 'o profissional'));
  protected readonly blockHint = computed(() => [
    'Bloquear é separado da denúncia: a análise do administrador continua do mesmo jeito.',
    'No próximo passo você vê tudo o que muda com o bloqueio antes de confirmar.',
  ]);

  protected askToReport(): void {
    this.toReport.set({ kind: this.kind(), id: this.personId(), name: this.name() });
  }

  protected closeReport(): void {
    if (!this.isSending()) {
      this.toReport.set(null);
    }
  }

  protected send(input: ReportInput): void {
    const target = this.toReport();
    if (!target) {
      return;
    }
    this.isSending.set(true);
    this.reportService.send(target.kind === 'patient' ? 'professional' : 'patient', target.id, input).subscribe({
      next: () => {
        this.isSending.set(false);
        this.toReport.set(null);
        this.reported.set(true);
        this.toastService.success('Denúncia enviada. Você será avisado quando o administrador julgar.');
        this.askingToBlock.set(true);
      },
      error: (error: Error) => {
        this.isSending.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected openBlock(): void {
    this.askingToBlock.set(false);
    this.toBlock.set({ kind: this.kind(), id: this.personId(), name: this.name() });
  }

  protected onBlocked(): void {
    this.toBlock.set(null);
    this.blocked.emit();
  }
}
