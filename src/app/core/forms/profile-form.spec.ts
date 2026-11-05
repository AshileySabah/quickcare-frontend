import { FormBuilder, Validators } from '@angular/forms';
import { identityDocumentValidator } from './document-validators';
import { passwordsMatchValidator } from './password-validators';
import {
  PERSONAL_DOCUMENT_TYPES,
  confirmPasswordError,
  disableAccountFields,
  missingDocumentMessage,
  profileFieldErrorsFor,
} from './profile-form';

describe('profile-form', () => {
  const fb = new FormBuilder();

  function form() {
    return fb.nonNullable.group(
      {
        name: ['', Validators.required],
        identityDocumentType: ['RG'],
        identityDocumentNumber: ['123'],
        identityDocumentUf: [''],
        lgpdConsent: [false, Validators.requiredTrue],
        password: ['Senha@123'],
        confirmPassword: ['Outra@123', Validators.required],
        birthDate: ['', Validators.required],
      },
      { validators: [passwordsMatchValidator(), identityDocumentValidator()] },
    );
  }

  it('mostra as mensagens próprias dos campos de perfil e os erros de grupo da identidade', () => {
    const group = form();
    group.markAllAsTouched();
    const fieldError = profileFieldErrorsFor(group);

    expect(fieldError('name')).toBe('Campo obrigatório.');
    expect(fieldError('lgpdConsent')).toBe('Esta confirmação é obrigatória.');
    expect(fieldError('identityDocumentUf')).toBe('Informe a UF que emitiu o RG.');
  });

  it('avisa quando a confirmação de senha não bate', () => {
    const group = form();

    expect(confirmPasswordError(group)).toBeNull();
    group.controls.confirmPassword.markAsTouched();
    expect(confirmPasswordError(group)).toBe('As senhas não coincidem.');
  });

  it('desabilita os dados da conta ao criar o outro perfil', () => {
    const group = form();

    disableAccountFields(group);

    expect(group.controls.name.disabled).toBeTrue();
    expect(group.controls.password.disabled).toBeTrue();
    expect(group.controls.birthDate.enabled).toBeTrue();
  });

  it('aponta o primeiro documento obrigatório que falta', () => {
    const documents = [{ type: 'VALIDACAO_CPF' }];

    expect(missingDocumentMessage(documents, ['VALIDACAO_CPF'])).toBeNull();
    expect(missingDocumentMessage(documents, ['VALIDACAO_CPF', 'REGISTRO_PROFISSIONAL'])).toBe(
      'Envie um documento que valide seu registro profissional.',
    );
  });

  it('não aceita documento sem tipo escolhido', () => {
    expect(missingDocumentMessage([{ type: 'COMPROVANTE_CPF' }, { type: '' }], PERSONAL_DOCUMENT_TYPES)).toBe(
      'Escolha o tipo de cada documento enviado.',
    );
  });

  it('o CPF tem documento próprio, além do documento de identidade', () => {
    expect(missingDocumentMessage([{ type: 'VALIDACAO_CPF' }], PERSONAL_DOCUMENT_TYPES)).toBe(
      'Envie um documento que comprove seu CPF.',
    );
    expect(missingDocumentMessage([{ type: 'COMPROVANTE_CPF' }, { type: 'VALIDACAO_CPF' }], PERSONAL_DOCUMENT_TYPES)).toBeNull();
  });
});
