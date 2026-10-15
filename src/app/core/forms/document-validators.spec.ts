import { FormControl, FormGroup } from '@angular/forms';
import { identityDocumentValidator, isValidCnh, isValidCnpj, isValidCpf, isValidRg } from './document-validators';

describe('document-validators', () => {
  it('confere os dígitos do CPF', () => {
    expect(isValidCpf('52998224725')).toBeTrue();
    expect(isValidCpf('52998224724')).toBeFalse();
    expect(isValidCpf('11111111111')).toBeFalse();
  });

  it('confere os dígitos do CNPJ', () => {
    expect(isValidCnpj('00000000000191')).toBeTrue();
    expect(isValidCnpj('00000000000192')).toBeFalse();
  });

  it('confere os dígitos da CNH', () => {
    expect(isValidCnh('02650306461')).toBeTrue();
    expect(isValidCnh('02650306462')).toBeFalse();
  });

  it('confere o dígito do RG de SP (inclusive X) e só o formato nos outros estados', () => {
    expect(isValidRg('246781312', 'SP')).toBeTrue();
    expect(isValidRg('246781313', 'SP')).toBeFalse();
    expect(isValidRg('10000006X', 'SP')).toBeTrue();
    expect(isValidRg('1234567', 'MG')).toBeTrue();
    expect(isValidRg('123', 'MG')).toBeFalse();
  });

  it('exige a UF emissora quando o documento é RG', () => {
    const group = new FormGroup(
      {
        identityDocumentType: new FormControl('RG'),
        identityDocumentNumber: new FormControl('24.678.131-2'),
        identityDocumentUf: new FormControl(''),
      },
      { validators: identityDocumentValidator() },
    );

    expect(group.hasError('identityDocumentUfRequired')).toBeTrue();

    group.controls.identityDocumentUf.setValue('SP');
    expect(group.valid).toBeTrue();

    group.controls.identityDocumentType.setValue('CNH');
    expect(group.getError('identityDocumentInvalid')).toBe('Número de CNH inválido.');
  });
});
