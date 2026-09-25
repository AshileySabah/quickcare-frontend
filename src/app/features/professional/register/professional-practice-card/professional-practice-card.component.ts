import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProfessionalCategoryInfo } from '../../../../core/models';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { CheckboxComponent } from '../../../../shared/ui/checkbox/checkbox.component';
import { GridItemComponent } from '../../../../shared/ui/grid/grid-item.component';
import { GridComponent } from '../../../../shared/ui/grid/grid.component';
import { InputComponent } from '../../../../shared/ui/input/input.component';
import { MultiSelectComponent, MultiSelectOption } from '../../../../shared/ui/multi-select/multi-select.component';
import { SelectComponent } from '../../../../shared/ui/select/select.component';

@Component({
  selector: 'ui-professional-practice-card',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardComponent,
    CheckboxComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    MultiSelectComponent,
    SelectComponent,
  ],
  templateUrl: './professional-practice-card.component.html',
  styleUrl: './professional-practice-card.component.scss',
})
export class ProfessionalPracticeCardComponent {
  group = input.required<FormGroup>();
  fieldError = input<(fieldName: string) => string | null>(() => null);

  categoryOptions = input.required<ProfessionalCategoryInfo[]>();
  specialtyOptions = input.required<MultiSelectOption[]>();
  isOutro = input.required<boolean>();
  requiresRegistration = input.required<boolean>();
  registrationLabel = input.required<string>();
  modalityError = input<string | null>(null);

  protected get categorySelected(): boolean {
    return !!this.group().get('category')?.value;
  }

  protected get attendsPresencial(): boolean {
    return !!this.group().get('attendsPresencial')?.value;
  }
}
