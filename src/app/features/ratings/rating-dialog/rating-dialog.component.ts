import { Component, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { PendingRating, RatingHighlight, RatingInput } from '../../../core/models';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { StarRatingComponent } from '../../../shared/ui/star-rating/star-rating.component';
import { ToggleChip, ToggleChipsComponent } from '../../../shared/ui/toggle-chips/toggle-chips.component';

export const RATING_CONSEQUENCES = [
  'A avaliação é anônima: aparece só na média e nos destaques do perfil, sem o seu nome.',
  'Ela passa a contar quando os dois avaliarem ou quando o prazo acabar.',
  'Depois de enviada, não dá para alterar.',
];

@Component({
  selector: 'app-rating-dialog',
  standalone: true,
  imports: [ConfirmDialogComponent, StarRatingComponent, ToggleChipsComponent],
  templateUrl: './rating-dialog.component.html',
  styleUrl: './rating-dialog.component.scss',
})
export class RatingDialogComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  item = input<PendingRating | null>(null);
  highlights = input<RatingHighlight[]>([]);
  loading = input(false);

  readonly submitted = output<RatingInput>();
  readonly closed = output<void>();

  protected readonly score = signal<number | null>(null);
  protected readonly chosen = signal<string[]>([]);
  protected readonly showScoreError = signal(false);
  protected readonly consequences = RATING_CONSEQUENCES;

  protected readonly positives = computed<ToggleChip[]>(() =>
    this.highlights()
      .filter((highlight) => highlight.positive)
      .map((highlight) => ({ value: highlight.code, label: highlight.label })),
  );
  protected readonly negatives = computed<ToggleChip[]>(() =>
    this.highlights()
      .filter((highlight) => !highlight.positive)
      .map((highlight) => ({ value: highlight.code, label: highlight.label })),
  );

  protected readonly message = computed(() => {
    const item = this.item();
    if (!item) {
      return '';
    }
    return item.ratedName
      ? `Como foi o atendimento de ${item.service} com ${item.ratedName}?`
      : `Como foi o atendimento de ${item.service}?`;
  });

  constructor() {
    effect(() => {
      if (this.item()) {
        untracked(() => {
          this.score.set(null);
          this.chosen.set([]);
          this.showScoreError.set(false);
        });
      }
    });
  }

  protected chooseScore(value: number): void {
    this.score.set(value);
    this.showScoreError.set(false);
  }

  protected setPositives(values: string[]): void {
    this.chosen.update((current) => [...current.filter((code) => !this.isPositive(code)), ...values]);
  }

  protected setNegatives(values: string[]): void {
    this.chosen.update((current) => [...current.filter((code) => this.isPositive(code)), ...values]);
  }

  protected selectedPositives(): string[] {
    return this.chosen().filter((code) => this.isPositive(code));
  }

  protected selectedNegatives(): string[] {
    return this.chosen().filter((code) => !this.isPositive(code));
  }

  protected confirm(): void {
    const score = this.score();
    if (score === null) {
      this.showScoreError.set(true);
      queueMicrotask(() => {
        const first = this.host.nativeElement.querySelector<HTMLElement>('.rating-dialog__stars button');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first?.focus();
      });
      return;
    }
    this.submitted.emit({ score, highlights: this.chosen() });
  }

  private isPositive(code: string): boolean {
    return this.highlights().some((highlight) => highlight.code === code && highlight.positive);
  }
}
