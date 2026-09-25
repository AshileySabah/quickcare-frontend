import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../layout/card/card.component';
import { GridItemComponent } from '../../layout/grid/grid-item.component';
import { GridComponent } from '../../layout/grid/grid.component';
import { InputComponent } from '../../forms/input/input.component';
import { SelectComponent, SelectOption } from '../../forms/select/select.component';

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'OUTRO', label: 'Outro' },
  { value: 'PREFIRO_NAO_INFORMAR', label: 'Prefiro não informar' },
];

@Component({
  selector: 'ui-basic-info-card',
  standalone: true,
  imports: [ReactiveFormsModule, CardComponent, GridComponent, GridItemComponent, InputComponent, SelectComponent],
  templateUrl: './basic-info-card.component.html',
  styleUrl: './basic-info-card.component.scss',
})
export class BasicInfoCardComponent {
  group = input.required<FormGroup>();
  fieldError = input<(fieldName: string) => string | null>(() => null);
  showCnpj = input(false);

  protected readonly genderOptions = GENDER_OPTIONS;
}
