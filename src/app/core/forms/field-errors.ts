import { AbstractControl, ValidationErrors } from '@angular/forms';

export type ErrorMessages = Partial<Record<string, string>>;

export type FieldMessages = Partial<Record<string, ErrorMessages>>;

const DEFAULT_MESSAGES: ErrorMessages = {
  required: 'Campo obrigatório.',
  email: 'E-mail inválido.',
  weakPassword: 'A senha não atende aos requisitos mínimos.',
  cpfInvalid: 'CPF inválido.',
  cnpjInvalid: 'CNPJ inválido.',
  pattern: 'Formato inválido.',
};

const FALLBACK_MESSAGE = 'Valor inválido.';

function messageWithLimit(key: string, error: ValidationErrors[string]): string | null {
  switch (key) {
    case 'minlength':
      return `Use pelo menos ${characters(error.requiredLength)}.`;
    case 'maxlength':
      return `Use no máximo ${characters(error.requiredLength)}.`;
    case 'min':
      return `O valor mínimo é ${error.min}.`;
    case 'max':
      return `O valor máximo é ${error.max}.`;
    default:
      return null;
  }
}

function characters(count: number): string {
  return count === 1 ? '1 caractere' : `${count} caracteres`;
}

export function controlError(control: AbstractControl | null, messages: ErrorMessages = {}): string | null {
  if (!control?.touched || !control.errors) {
    return null;
  }

  const errors = control.errors;
  for (const key of Object.keys(errors)) {
    const message = messages[key] ?? DEFAULT_MESSAGES[key] ?? messageWithLimit(key, errors[key]);
    if (message) {
      return message;
    }
  }

  return FALLBACK_MESSAGE;
}

export function fieldErrorsFor(group: AbstractControl, messages: FieldMessages = {}): (fieldName: string) => string | null {
  return (fieldName) => controlError(group.get(fieldName), messages[fieldName]);
}
