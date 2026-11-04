import { Component, computed, input } from '@angular/core';
import { CardComponent } from '../../layout/card/card.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'ui-skeleton-list',
  standalone: true,
  imports: [CardComponent, SkeletonComponent],
  templateUrl: './skeleton-list.component.html',
  styleUrl: './skeleton-list.component.scss',
})
export class SkeletonListComponent {
  variant = input<'cards' | 'page' | 'form'>('cards');
  count = input(3);

  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
