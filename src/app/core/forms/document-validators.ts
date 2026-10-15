import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { IdentityDocumentType } from '../models';

/*
 * Validação por algoritmo (formato + dígitos verificadores), igual à do back.
 * Só diz se o número "faz sentido"; se ele existe é conferido pelo admin.
 */

function allSameDigits(value: string): boolean {
  return new Set(value).size === 1;
}

function digits(value: string): number[] {
  return [...value].map(Number);
}

export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || allSameDigits(cpf)) {
    return false;
  }

  const d = digits(cpf);
  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += d[i] * (length + 1 - i);
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return d[9] === checkDigit(9) && d[10] === checkDigit(10);
}

export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || allSameDigits(cnpj)) {
    return false;
  }

  const d = digits(cnpj);
  const checkDigit = (weights: number[]): number => {
    const sum = weights.reduce((total, weight, i) => total + d[i] * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return (
    d[12] === checkDigit([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    d[13] === checkDigit([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  );
}

/** Algoritmo do Denatran para os 11 dígitos da CNH. */
export function isValidCnh(cnh: string): boolean {
  if (!/^\d{11}$/.test(cnh) || allSameDigits(cnh)) {
    return false;
  }

  const d = digits(cnh);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += d[i] * (9 - i);
  }
  let dv1 = sum % 11;
  let discount = 0;
  if (dv1 >= 10) {
    dv1 = 0;
    discount = 2;
  }

  sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += d[i] * (i + 1);
  }
  const remainder = sum % 11;
  const dv2 = remainder >= 10 ? 0 : remainder - discount;

  return d[9] === dv1 && d[10] === dv2;
}

/** Só o RG de SP tem dígito verificador público; nos demais estados, só o formato. */
export function isValidRg(rg: string, uf: string): boolean {
  const normalized = rg.toUpperCase();

  if (uf.toUpperCase() === 'SP') {
    if (!/^\d{8}[\dX]$/.test(normalized)) {
      return false;
    }
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += Number(normalized[i]) * (i + 2);
    }
    const dv = (11 - (sum % 11)) % 11;
    return normalized[8] === (dv === 10 ? 'X' : String(dv));
  }

  return /^\d{4,13}[\dX]$/.test(normalized);
}

/** Mantém só dígitos e o X do dígito verificador. */
export function normalizeIdentityNumber(value: string): string {
  return value.replace(/[^0-9xX]/g, '').toUpperCase();
}

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    return !value || isValidCpf(value) ? null : { cpfInvalid: true };
  };
}

/** CNPJ é opcional: vazio é aceito. */
export function cnpjValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    return !value || isValidCnpj(value) ? null : { cnpjInvalid: true };
  };
}

/**
 * Validador de grupo para o documento de identidade: o número depende do
 * tipo (RG/CNH) e, no RG, da UF emissora. Os nomes dos controles são
 * configuráveis para servir ao cadastro e ao reenvio.
 */
export function identityDocumentValidator(
  typeControl = 'identityDocumentType',
  numberControl = 'identityDocumentNumber',
  ufControl = 'identityDocumentUf',
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const type = group.get(typeControl)?.value as IdentityDocumentType | '';
    const number = normalizeIdentityNumber((group.get(numberControl)?.value as string) ?? '');
    const uf = (group.get(ufControl)?.value as string) ?? '';

    if (!type || !number) {
      return null;
    }

    if (type === 'CNH') {
      return isValidCnh(number) ? null : { identityDocumentInvalid: 'Número de CNH inválido.' };
    }

    if (!uf) {
      return { identityDocumentUfRequired: true };
    }

    if (!isValidRg(number, uf)) {
      return {
        identityDocumentInvalid:
          uf.toUpperCase() === 'SP' ? 'Número de RG inválido (o dígito verificador não confere).' : 'Número de RG inválido.',
      };
    }

    return null;
  };
}
