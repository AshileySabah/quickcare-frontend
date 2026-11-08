import { Component, computed, input } from '@angular/core';
import { RatingSummary } from '../../../core/models';
import { BadgeComponent } from '../feedback/badge/badge.component';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'ui-rating-summary',
  standalone: true,
  imports: [BadgeComponent, StarRatingComponent],
  templateUrl: './rating-summary.component.html',
  styleUrl: './rating-summary.component.scss',
})
export class RatingSummaryComponent {
  summary = input.required<RatingSummary>();

  protected readonly averageText = computed(() =>
    (this.summary().average ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  );

  protected readonly totalText = computed(() => {
    const total = this.summary().total;
    return total === 1 ? '1 avaliação' : `${total} avaliações`;
  });
}
