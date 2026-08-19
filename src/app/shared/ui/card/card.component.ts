import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  interactive = input(false);
}
