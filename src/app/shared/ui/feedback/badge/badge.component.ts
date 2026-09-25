import { Component, input } from '@angular/core';

export type BadgeVariant = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error';

@Component({
  selector: 'ui-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  variant = input<BadgeVariant>('neutral');
}
