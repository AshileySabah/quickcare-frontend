import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../layout/card/card.component';
import { CheckboxComponent } from '../../forms/checkbox/checkbox.component';

@Component({
  selector: 'ui-declarations-card',
  standalone: true,
  imports: [ReactiveFormsModule, CardComponent, CheckboxComponent],
  templateUrl: './declarations-card.component.html',
  styleUrl: './declarations-card.component.scss',
})
export class DeclarationsCardComponent {
  group = input.required<FormGroup>();
  fieldError = input<(fieldName: string) => string | null>(() => null);
}
