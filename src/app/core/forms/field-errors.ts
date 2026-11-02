import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Mensagem por chave de erro, para um campo: { pattern: 'CEP deve ter 8 dígitos.' }. */
export type ErrorMessages = Partial<Record<string, string>>;

/** Mensagens específicas por campo; o que não estiver aqui usa a mensagem padrão do erro. */
export type FieldMessages = Partial<Record<string, ErrorMessages>>;

const DEFAULT_MESSAGES: ErrorMessages = {
  required: 'Campo obrigatório.',
  email: 'E-mail inválido.',
  weakPassword: 'A senha não atende aos requisitos mínimos.',
  cpfInvalid: 'CPF inválido.',
  cnpjInvalid: 'CNPJ inválido.',
  pattern: 'Formato inválido.',
};

/** Para quando nenhum erro do campo tem mensagem: o envio nunca fica barrado em silêncio. */
const FALLBACK_MESSAGE = 'Valor inválido.';

/** As que dependem do limite do validador (ex.: "mínimo 20 caracteres"). */
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

/**
 * Mensagem do primeiro erro de um campo já tocado; nada enquanto a pessoa não
 * passou por ele. Todo erro tem mensagem: a do campo, a padrão do erro ou, sem
 * nenhuma, uma genérica.
 */
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

/** O `fieldError` que os cards de formulário recebem: busca o campo pelo nome dentro do grupo. */
export function fieldErrorsFor(group: AbstractControl, messages: FieldMessages = {}): (fieldName: string) => string | null {
  return (fieldName) => controlError(group.get(fieldName), messages[fieldName]);
}
