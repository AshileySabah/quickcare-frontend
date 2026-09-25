import { Component, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CardComponent } from '../../layout/card/card.component';
import { PasswordFieldsComponent } from '../../forms/password-fields/password-fields.component';

@Component({
  selector: 'ui-password-card',
  standalone: true,
  imports: [CardComponent, PasswordFieldsComponent],
  templateUrl: './password-card.component.html',
  styleUrl: './password-card.component.scss',
})
export class PasswordCardComponent {
  group = input.required<FormGroup>();
  passwordError = input<string | null>(null);
  confirmPasswordError = input<string | null>(null);
}
