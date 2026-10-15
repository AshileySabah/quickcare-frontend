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

const IDENTITY_DOCUMENT_OPTIONS: SelectOption[] = [
  { value: 'RG', label: 'RG' },
  { value: 'CNH', label: 'CNH' },
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
  showEmail = input(true);
  showCpf = input(true);
  showCnpj = input(false);
  /** Tipo, número e UF emissora do RG/CNH — exigidos no cadastro para a etapa de identidade. */
  showIdentityDocument = input(false);
  ufOptions = input<SelectOption[]>([]);

  protected readonly genderOptions = GENDER_OPTIONS;
  protected readonly identityDocumentOptions = IDENTITY_DOCUMENT_OPTIONS;

  protected get isRg(): boolean {
    return this.group().get('identityDocumentType')?.value === 'RG';
  }
}
