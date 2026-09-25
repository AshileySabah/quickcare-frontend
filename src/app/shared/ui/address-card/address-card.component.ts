import { Component, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AddressComponent } from '../address/address.component';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'ui-address-card',
  standalone: true,
  imports: [CardComponent, AddressComponent],
  templateUrl: './address-card.component.html',
  styleUrl: './address-card.component.scss',
})
export class AddressCardComponent {
  group = input.required<FormGroup>();
  fieldError = input<(fieldName: string) => string | null>(() => null);
}
