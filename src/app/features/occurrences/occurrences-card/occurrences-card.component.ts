import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import {
  APPEAL_STATUS_LABELS,
  OCCURRENCE_REASON_LABELS,
  Occurrence,
  OccurrenceSummary,
  SwitchableRole,
} from '../../../core/models';
import { OccurrenceService } from '../../../core/services/occurrence.service';
import { BadgeComponent, BadgeVariant } from '../../../shared/ui/feedback/badge/badge.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { HighlightDirective } from '../../../shared/ui/highlight/highlight.directive';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { JustificationDialogComponent } from '../../../shared/ui/justification-dialog/justification-dialog.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { blockMessage, blockedAction } from '../block-text';

/** Quantas ocorrências recentes aparecem no quadro (as mais novas). */
const RECENT = 5;
/** O primeiro bloqueio dura 7 dias; os seguintes, 14, 21... (regra do back). */
const FIRST_BLOCK_DAYS = 7;

/**
 * As ocorrências do perfil na home: quantas contam (de 3 em 90 dias), o
 * bloqueio atual e as mais recentes, cada uma com o recurso ao admin (uma vez
 * só). O status do recurso aparece só depois de recorrer; aceito, a ocorrência
 * nem vem mais na lista. Só aparece quando há algo para mostrar. As
 * notificações de ocorrência, bloqueio e recurso trazem para cá (?destaque=ocorrencias).
 */
@Component({
  selector: 'app-occurrences-card',
  standalone: true,
  imports: [
    DatePipe,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    HighlightDirective,
    IconComponent,
    JustificationDialogComponent,
    NoticeComponent,
  ],
  templateUrl: './occurrences-card.component.html',
  styleUrl: './occurrences-card.component.scss',
})
export class OccurrencesCardComponent implements OnInit {
  private readonly occurrenceService = inject(OccurrenceService);
  private readonly toastService = inject(ToastService);

  role = input.required<SwitchableRole>();

  /** Se o perfil está bloqueado agora, para a tela desabilitar a criação. */
  readonly blockedChange = output<boolean>();

  protected readonly summary = signal<OccurrenceSummary | null>(null);
  protected readonly labels = OCCURRENCE_REASON_LABELS;
  protected readonly appealLabels = APPEAL_STATUS_LABELS;

  protected readonly toAppeal = signal<Occurrence | null>(null);
  protected readonly isAppealing = signal(false);

  protected readonly visible = computed(() => {
    const summary = this.summary();
    return !!summary && (!!summary.block || summary.occurrences.some((item) => this.recent(item.createdAt, summary)));
  });
  protected readonly recentOccurrences = computed(() => (this.summary()?.occurrences ?? []).slice(0, RECENT));

  protected readonly blockText = computed(() => {
    const block = this.summary()?.block;
    return block ? blockMessage(this.role(), block) : null;
  });

  /**
   * As que causaram o bloqueio contam enquanto ele dura e deixam de contar
   * quando ele termina; depois disso aparecem marcadas ("Já gerou bloqueio").
   */
  protected readonly ruleText = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return '';
    }
    const counting = `${summary.counting} de ${summary.limit} contando nos últimos ${summary.windowDays} dias.`;
    if (summary.block) {
      return `${counting} Quando o bloqueio acabar, as ocorrências que o causaram deixam de contar.`;
    }
    const alreadyBlocked = summary.occurrences.some((item) => item.alreadyBlocked);
    return (
      `${counting} Ao chegar a ${summary.limit}, você fica pelo menos ${FIRST_BLOCK_DAYS} dias sem ${blockedAction(this.role())}.` +
      (alreadyBlocked ? ' As marcadas com "Já gerou bloqueio" não contam mais.' : '')
    );
  });

  protected readonly appealConsequences = [
    'Um administrador analisa e decide se a ocorrência é anulada ou mantida.',
    'Você só pode recorrer uma vez de cada ocorrência.',
    'Enquanto isso, ela continua contando.',
  ];

  ngOnInit(): void {
    this.occurrenceService.summary(this.role()).subscribe({
      next: (summary) => this.show(summary),
      // O quadro é complementar: sem ele, a home segue normal.
      error: () => this.summary.set(null),
    });
  }

  protected appealVariant(occurrence: Occurrence): BadgeVariant {
    return occurrence.appeal?.status === 'mantida' ? 'error' : 'info';
  }

  protected confirmAppeal(text: string): void {
    const occurrence = this.toAppeal();
    if (!occurrence) {
      return;
    }
    this.isAppealing.set(true);
    this.occurrenceService.appeal(this.role(), occurrence.id, text).subscribe({
      next: (summary) => {
        this.isAppealing.set(false);
        this.toAppeal.set(null);
        this.show(summary);
        this.toastService.success('Recurso enviado. Você será avisado quando o administrador decidir.');
      },
      error: (error: Error) => {
        this.isAppealing.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private show(summary: OccurrenceSummary): void {
    this.summary.set(summary);
    this.blockedChange.emit(!!summary.block);
  }

  private recent(createdAt: string, summary: OccurrenceSummary): boolean {
    return Date.now() - new Date(createdAt).getTime() < summary.windowDays * 24 * 60 * 60 * 1000;
  }
}
