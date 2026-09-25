import { Component, input } from '@angular/core';

export type GridSpacing = 'none' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'ui-grid',
  standalone: true,
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  host: {
    class: 'ui-grid',
    '[class.ui-grid--spacing-none]': "spacing() === 'none'",
    '[class.ui-grid--spacing-sm]': "spacing() === 'sm'",
    '[class.ui-grid--spacing-md]': "spacing() === 'md'",
    '[class.ui-grid--spacing-lg]': "spacing() === 'lg'",
    '[class.ui-grid--spacing-xl]': "spacing() === 'xl'",
  },
})
export class GridComponent {
  spacing = input<GridSpacing>('md');
}
