import { Component, input, output } from '@angular/core';

export interface ToggleChip {
  value: string;
  label: string;
}

@Component({
  selector: 'ui-toggle-chips',
  standalone: true,
  template: `
    <div class="ui-toggle-chips" role="group" [attr.aria-label]="label()">
      @for (chip of chips(); track chip.value) {
        <button
          type="button"
          class="ui-toggle-chips__chip"
          [class.ui-toggle-chips__chip--active]="selected().includes(chip.value)"
          [class.ui-toggle-chips__chip--negative]="tone() === 'negative'"
          [attr.aria-pressed]="selected().includes(chip.value)"
          (click)="toggle(chip.value)"
        >
          {{ chip.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './toggle-chips.component.scss',
})
export class ToggleChipsComponent {
  chips = input.required<ToggleChip[]>();
  selected = input.required<string[]>();
  label = input.required<string>();
  tone = input<'positive' | 'negative'>('positive');

  readonly selectedChange = output<string[]>();

  protected toggle(value: string): void {
    const current = this.selected();
    this.selectedChange.emit(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }
}
