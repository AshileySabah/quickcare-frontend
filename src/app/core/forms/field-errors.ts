import { AbstractControl } from '@angular/forms';

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
};

/** Mensagem do primeiro erro de um campo já tocado; nada enquanto a pessoa não passou por ele. */
export function controlError(control: AbstractControl | null, messages: ErrorMessages = {}): string | null {
  if (!control?.touched || !control.errors) {
    return null;
  }

  for (const key of Object.keys(control.errors)) {
    const message = messages[key] ?? DEFAULT_MESSAGES[key];
    if (message) {
      return message;
    }
  }

  return null;
}

/** O `fieldError` que os cards de formulário recebem: busca o campo pelo nome dentro do grupo. */
export function fieldErrorsFor(group: AbstractControl, messages: FieldMessages = {}): (fieldName: string) => string | null {
  return (fieldName) => controlError(group.get(fieldName), messages[fieldName]);
}
