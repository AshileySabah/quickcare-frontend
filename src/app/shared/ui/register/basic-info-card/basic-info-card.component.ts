import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { latestBirthDate } from '../../../../core/forms/birth-date';
import { CardComponent } from '../../layout/card/card.component';
import { GridItemComponent } from '../../layout/grid/grid-item.component';
import { GridComponent } from '../../layout/grid/grid.component';
import { InputComponent } from '../../forms/input/input.component';
import { SelectComponent, SelectOption } from '../../forms/select/select.component';
import { GENDER_OPTIONS, IDENTITY_DOCUMENT_OPTIONS } from '../register-options';

@Component({
  selector: 'ui-basic-info-card',
  standalone: true,
  imports: [ReactiveFormsModule, CardComponent, GridComponent, GridItemComponent, InputComponent, SelectComponent],
  templateUrl: './basic-info-card.component.html',
  styleUrl: './basic-info-card.component.scss',
})
export class BasicInfoCardComponent {
  protected readonly latestBirthDate = latestBirthDate();

  group = input.required<FormGroup>();
  fieldError = input<(fieldName: string) => string | null>(() => null);
  showName = input(true);
  showPhone = input(true);
  showEmail = input(true);
  showCpf = input(true);
  showCnpj = input(false);
  showIdentityDocument = input(false);
  showBirthDate = input(true);
  showGender = input(true);
  ufOptions = input<SelectOption[]>([]);

  protected readonly genderOptions = GENDER_OPTIONS;
  protected readonly identityDocumentOptions = IDENTITY_DOCUMENT_OPTIONS;

  protected get isRg(): boolean {
    return this.group().get('identityDocumentType')?.value === 'RG';
  }
}
