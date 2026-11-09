import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { fieldErrorsFor } from '../../../../core/forms/field-errors';
import { PRACTICE_AREA_MESSAGES, PracticeAreaGroup, practiceAreaKey } from '../../../../core/forms/practice-area-form';
import { ProfessionalCategoryInfo, Specialty, practiceAreaRequiresRegistration } from '../../../../core/models';
import { FilePickerComponent } from '../../../../shared/ui/forms/file-picker/file-picker.component';
import { InputComponent } from '../../../../shared/ui/forms/input/input.component';
import { MultiSelectComponent, MultiSelectOption } from '../../../../shared/ui/forms/multi-select/multi-select.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/forms/select/select.component';
import { GridItemComponent } from '../../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../../shared/ui/layout/grid/grid.component';

@Component({
  selector: 'app-practice-area-fields',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FilePickerComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    MultiSelectComponent,
    SelectComponent,
  ],
  templateUrl: './practice-area-fields.component.html',
})
export class PracticeAreaFieldsComponent {
  group = input.required<PracticeAreaGroup>();
  categoryOptions = input<ProfessionalCategoryInfo[]>([]);
  specialties = input<Specialty[]>([]);
  ufOptions = input<SelectOption[]>([]);
  showDocument = input(true);
  siblings = input<PracticeAreaGroup[]>([]);
  existingKeys = input<string[]>([]);

  protected fieldError(fieldName: string): string | null {
    return fieldErrorsFor(this.group(), PRACTICE_AREA_MESSAGES)(fieldName);
  }

  private get takenKeys(): Set<string> {
    const keys = new Set(this.existingKeys());
    for (const other of this.siblings()) {
      if (other === this.group()) {
        continue;
      }
      const key = practiceAreaKey(other.controls.category.value, other.controls.specialtyIds.value);
      if (key) {
        keys.add(key);
      }
    }
    return keys;
  }

  protected get categorySelectOptions(): SelectOption[] {
    const taken = this.takenKeys;
    return this.categoryOptions().map((option) => {
      const blocked = option.value !== 'OUTRO' && taken.has(option.value);
      return { value: option.value, label: blocked ? `${option.label} (já incluída)` : option.label, disabled: blocked };
    });
  }

  protected get singleSpecialtyOptions(): SelectOption[] {
    const taken = this.takenKeys;
    return this.specialtyOptions.map((option) => {
      const blocked = taken.has(`OUTRO:${option.value}`);
      return { ...option, label: blocked ? `${option.label} (já incluída)` : option.label, disabled: blocked };
    });
  }

  protected get category() {
    return this.group().controls.category.value;
  }

  protected get requiresRegistration(): boolean {
    return practiceAreaRequiresRegistration(this.category);
  }

  protected get registrationLabel(): string {
    return (
      this.categoryOptions().find((option) => option.value === this.category)?.registrationLabel ?? 'Registro profissional'
    );
  }

  protected get specialtyOptions(): MultiSelectOption[] {
    return this.specialties()
      .filter((specialty) => specialty.category === this.category)
      .map((specialty) => ({ value: specialty.id, label: specialty.name }));
  }

  protected onDocumentChange(file: File | null): void {
    const control = this.group().controls.document;
    control.setValue(file);
    control.markAsTouched();
  }
}
