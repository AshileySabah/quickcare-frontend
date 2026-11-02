import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Address } from '../models';
import { FieldMessages, fieldErrorsFor } from './field-errors';

export function buildAddressGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    street: ['', Validators.required],
    number: ['', Validators.required],
    complement: [''],
    neighborhood: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
  });
}

export function toAddress(value: Address): Address {
  return { ...value, complement: value.complement || undefined };
}

const ADDRESS_MESSAGES: FieldMessages = {
  cep: { pattern: 'CEP deve conter 8 dígitos, sem hífen.' },
  state: { pattern: 'Informe a sigla do estado (ex.: SP).' },
};

export function addressFieldErrorsFor(addressGroup: AbstractControl): (fieldName: string) => string | null {
  return fieldErrorsFor(addressGroup, ADDRESS_MESSAGES);
}
