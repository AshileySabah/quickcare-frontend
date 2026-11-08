import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../../../shared/ui/layout/card/card.component';
import { CheckboxComponent } from '../../../../shared/ui/forms/checkbox/checkbox.component';
import { GridItemComponent } from '../../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../../shared/ui/layout/grid/grid.component';
import { InputComponent } from '../../../../shared/ui/forms/input/input.component';

@Component({
  selector: 'ui-professional-practice-card',
  standalone: true,
  imports: [ReactiveFormsModule, CardComponent, CheckboxComponent, GridComponent, GridItemComponent, InputComponent],
  templateUrl: './professional-practice-card.component.html',
  styleUrl: './professional-practice-card.component.scss',
})
export class ProfessionalPracticeCardComponent {
  group = input.required<FormGroup>();
  fieldError = input<(fieldName: string) => string | null>(() => null);
  modalityError = input<string | null>(null);

  protected get attendsPresencial(): boolean {
    return !!this.group().get('attendsPresencial')?.value;
  }
}
