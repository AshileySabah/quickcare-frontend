import { Component, input } from '@angular/core';

export type GridSpan = number | null;

@Component({
  selector: 'ui-grid-item',
  standalone: true,
  templateUrl: './grid-item.component.html',
  styleUrl: './grid-item.component.scss',
  host: {
    class: 'ui-grid-item',
    '[style.--ui-grid-xs]': 'xs()',
    '[style.--ui-grid-sm]': 'sm()',
    '[style.--ui-grid-md]': 'md()',
    '[style.--ui-grid-lg]': 'lg()',
    '[style.--ui-grid-xl]': 'xl()',
  },
})
export class GridItemComponent {
  xs = input<GridSpan>(12);
  sm = input<GridSpan>(null);
  md = input<GridSpan>(null);
  lg = input<GridSpan>(null);
  xl = input<GridSpan>(null);
}
