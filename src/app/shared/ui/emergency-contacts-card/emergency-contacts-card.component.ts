import { Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EmergencyContactGroup, buildEmergencyContactGroup } from '../../../core/forms/emergency-contact-form';
import { ButtonComponent } from '../button/button.component';
import { CardComponent } from '../card/card.component';
import { InputComponent } from '../input/input.component';

@Component({
  selector: 'ui-emergency-contacts-card',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, CardComponent, InputComponent],
  templateUrl: './emergency-contacts-card.component.html',
  styleUrl: './emergency-contacts-card.component.scss',
})
export class EmergencyContactsCardComponent {
  private readonly fb = inject(FormBuilder);

  formArray = input.required<FormArray<EmergencyContactGroup>>();

  protected add(): void {
    this.formArray().push(buildEmergencyContactGroup(this.fb));
  }

  protected remove(index: number): void {
    this.formArray().removeAt(index);
  }

  protected fieldError(index: number, fieldName: 'name' | 'phone'): string | null {
    const control = this.formArray().at(index).get(fieldName);

    if (!control || !control.touched || !control.hasError('required')) {
      return null;
    }

    return 'Campo obrigatório.';
  }
}
