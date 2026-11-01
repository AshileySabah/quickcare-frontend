import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { addressFieldErrorsFor, buildAddressGroup } from './address-form';
import { controlError, fieldErrorsFor } from './field-errors';

describe('field-errors', () => {
  it('não mostra erro antes de o campo ser tocado', () => {
    const control = new FormControl('', Validators.required);

    expect(controlError(control)).toBeNull();
    control.markAsTouched();
    expect(controlError(control)).toBe('Campo obrigatório.');
  });

  it('usa a mensagem do campo antes da padrão', () => {
    const group = new FormGroup({ description: new FormControl('curta', Validators.minLength(20)) });
    group.markAllAsTouched();

    const fieldError = fieldErrorsFor(group, { description: { minlength: 'Descreva com mais detalhes.' } });

    expect(fieldError('description')).toBe('Descreva com mais detalhes.');
  });

  it('não mostra nada para um erro sem mensagem', () => {
    const control = new FormControl('abc', Validators.maxLength(1));
    control.markAsTouched();

    expect(controlError(control)).toBeNull();
  });

  it('traduz os erros do endereço', () => {
    const address = buildAddressGroup(new FormBuilder());
    address.patchValue({ cep: '123', state: 'São Paulo' });
    address.markAllAsTouched();

    const fieldError = addressFieldErrorsFor(address);

    expect(fieldError('cep')).toBe('CEP deve conter 8 dígitos, sem hífen.');
    expect(fieldError('state')).toBe('Informe a sigla do estado (ex.: SP).');
    expect(fieldError('street')).toBe('Campo obrigatório.');
    expect(fieldError('complement')).toBeNull();
  });
});
