import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  width = input('100%');
  height = input('16px');
  radius = input('4px');
}
