import { Component, computed, input, output, signal } from '@angular/core';

const STARS = [1, 2, 3, 4, 5];

@Component({
  selector: 'ui-star-rating',
  standalone: true,
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  value = input<number | null>(null);
  editable = input(false);
  size = input(20);
  label = input('Nota');
  invalid = input(false);

  readonly valueChange = output<number>();

  protected readonly stars = STARS;
  protected readonly hovered = signal<number | null>(null);

  protected readonly shown = computed(() => this.hovered() ?? Math.round(this.value() ?? 0));

  protected readonly readonlyLabel = computed(() => {
    const value = this.value();
    return value === null ? 'Sem nota' : `${String(value).replace('.', ',')} de 5 estrelas`;
  });

  protected choose(star: number): void {
    this.valueChange.emit(star);
  }

  protected starLabel(star: number): string {
    return star === 1 ? '1 estrela' : `${star} estrelas`;
  }
}
