import { Component, input, output } from '@angular/core';

export interface FilterChip<T> {
  value: T;
  label: string;
}

/** Filtro de uma escolha só, em pílulas (ex.: situação da lista do admin). */
@Component({
  selector: 'ui-filter-chips',
  standalone: true,
  template: `
    <div class="ui-filter-chips" role="group" [attr.aria-label]="label()">
      @for (chip of chips(); track chip.label) {
        <button
          type="button"
          class="ui-filter-chips__chip"
          [class.ui-filter-chips__chip--active]="selected() === chip.value"
          [attr.aria-pressed]="selected() === chip.value"
          (click)="selectedChange.emit(chip.value)"
        >
          {{ chip.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './filter-chips.component.scss',
})
export class FilterChipsComponent<T> {
  chips = input.required<FilterChip<T>[]>();
  selected = input.required<T>();
  /** Para leitores de tela: "Filtrar por situação". */
  label = input.required<string>();

  readonly selectedChange = output<T>();
}
