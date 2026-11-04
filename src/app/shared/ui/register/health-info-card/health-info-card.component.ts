import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../layout/card/card.component';
import { GridItemComponent } from '../../layout/grid/grid-item.component';
import { GridComponent } from '../../layout/grid/grid.component';
import { TextareaComponent } from '../../forms/textarea/textarea.component';

@Component({
  selector: 'ui-health-info-card',
  standalone: true,
  imports: [ReactiveFormsModule, CardComponent, GridComponent, GridItemComponent, TextareaComponent],
  templateUrl: './health-info-card.component.html',
  styleUrl: './health-info-card.component.scss',
})
export class HealthInfoCardComponent {
  group = input.required<FormGroup>();
  readonly = input(false);
}
