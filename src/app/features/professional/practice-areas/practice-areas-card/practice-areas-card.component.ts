import { Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { PracticeAreaGroup, buildPracticeAreaGroup } from '../../../../core/forms/practice-area-form';
import { ProfessionalCategoryInfo, Specialty } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { SelectOption } from '../../../../shared/ui/forms/select/select.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../../shared/ui/layout/card/card.component';
import { PracticeAreaFieldsComponent } from '../practice-area-fields/practice-area-fields.component';

@Component({
  selector: 'app-practice-areas-card',
  standalone: true,
  imports: [ButtonComponent, CardComponent, IconComponent, PracticeAreaFieldsComponent],
  templateUrl: './practice-areas-card.component.html',
  styleUrl: './practice-areas-card.component.scss',
})
export class PracticeAreasCardComponent {
  private readonly fb = inject(FormBuilder);

  formArray = input.required<FormArray<PracticeAreaGroup>>();
  categoryOptions = input<ProfessionalCategoryInfo[]>([]);
  specialties = input<Specialty[]>([]);
  ufOptions = input<SelectOption[]>([]);

  protected add(): void {
    this.formArray().push(buildPracticeAreaGroup(this.fb));
  }

  protected remove(index: number): void {
    this.formArray().removeAt(index);
  }

  protected get duplicated(): boolean {
    return this.formArray().hasError('duplicatedPracticeArea');
  }
}
