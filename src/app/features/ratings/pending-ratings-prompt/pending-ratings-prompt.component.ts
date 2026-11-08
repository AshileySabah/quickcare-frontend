import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { SwitchableRole } from '../../../core/models';
import { RatingService } from '../../../core/services/rating.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { RatingDialogComponent } from '../rating-dialog/rating-dialog.component';
import { createRatingFlow } from '../rating-flow';

@Component({
  selector: 'app-pending-ratings-prompt',
  standalone: true,
  imports: [ConfirmDialogComponent, RatingDialogComponent],
  template: `
    <ui-confirm-dialog
      [open]="asking()"
      titleText="Atendimentos para avaliar"
      icon="check"
      [message]="message()"
      [consequences]="consequences"
      confirmLabel="Sim, avaliar agora"
      cancelLabel="Não, avaliar depois"
      (confirmed)="rateNow()"
      (closed)="later()"
    ></ui-confirm-dialog>

    <app-rating-dialog
      [item]="flow.current()"
      [highlights]="flow.highlights()"
      [loading]="flow.sending()"
      (submitted)="flow.submit($event)"
      (closed)="flow.close()"
    ></app-rating-dialog>
  `,
})
export class PendingRatingsPromptComponent implements OnInit {
  private readonly ratingService = inject(RatingService);

  role = input.required<SwitchableRole>();

  protected readonly flow = createRatingFlow(() => this.role());
  protected readonly asking = signal(false);

  protected readonly message = computed(() => {
    const total = this.flow.pending().length;
    return total === 1
      ? 'Você tem 1 atendimento para avaliar. Quer avaliar antes de continuar?'
      : `Você tem ${total} atendimentos para avaliar. Quer avaliar antes de continuar?`;
  });

  protected readonly consequences = [
    'Leva menos de um minuto: uma nota de 1 a 5 e, se quiser, alguns destaques.',
    'A avaliação é anônima e ajuda outras pessoas a escolher.',
  ];

  ngOnInit(): void {
    if (!this.ratingService.shouldPrompt(this.role())) {
      return;
    }
    this.flow.load((pending) => this.asking.set(pending.length > 0));
  }

  protected rateNow(): void {
    const first = this.flow.pending()[0];
    this.asking.set(false);
    this.ratingService.dismissPrompt(this.role());
    if (first) {
      this.flow.open(first);
    }
  }

  protected later(): void {
    this.asking.set(false);
    this.ratingService.dismissPrompt(this.role());
  }
}
