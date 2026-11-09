import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { BAN_APPEAL_LABELS, Ban, SwitchableRole } from '../../../core/models';
import { BanService } from '../../../core/services/ban.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent, BadgeVariant } from '../../../shared/ui/feedback/badge/badge.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';
import { banMessage } from '../../occurrences/block-text';

@Component({
  selector: 'app-ban-notice',
  standalone: true,
  imports: [DatePipe, BadgeComponent, ButtonComponent, IconComponent, JustificationDialogComponent],
  templateUrl: './ban-notice.component.html',
  styleUrl: './ban-notice.component.scss',
})
export class BanNoticeComponent implements OnInit {
  private readonly banService = inject(BanService);
  private readonly toastService = inject(ToastService);

  role = input.required<SwitchableRole>();

  protected readonly ban = signal<Ban | null>(null);
  protected readonly appealing = signal(false);
  protected readonly sending = signal(false);
  protected readonly appealLabels = BAN_APPEAL_LABELS;

  protected readonly message = computed(() => {
    const ban = this.ban();
    return ban ? banMessage(ban) : '';
  });

  protected readonly appealVariant = computed<BadgeVariant>(() =>
    this.ban()?.appeal?.status === 'negado' ? 'error' : 'info',
  );

  protected readonly appealConsequences = [
    'Um administrador analisa e decide se remove o banimento.',
    'Você só pode recorrer uma vez deste banimento.',
    'Enquanto isso, o perfil continua banido.',
  ];

  ngOnInit(): void {
    this.banService.current(this.role()).subscribe({
      next: (ban) => this.ban.set(ban),
      error: () => this.ban.set(null),
    });
  }

  protected sendAppeal(text: string): void {
    const ban = this.ban();
    if (!ban) {
      return;
    }
    this.sending.set(true);
    this.banService.appeal(this.role(), ban.id, text).subscribe({
      next: (updated) => {
        this.sending.set(false);
        this.appealing.set(false);
        this.ban.set(updated);
        this.toastService.success('Recurso enviado. Você será avisado quando o administrador decidir.');
      },
      error: (error: Error) => {
        this.sending.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected closeAppeal(): void {
    if (!this.sending()) {
      this.appealing.set(false);
    }
  }
}
