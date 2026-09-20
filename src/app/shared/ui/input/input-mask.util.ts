export type InputMask = 'cpf' | 'cnpj' | 'cep' | 'phone';

const RAW_MAX_LENGTH: Record<InputMask, number> = {
  cpf: 11,
  cnpj: 14,
  cep: 8,
  phone: 11,
};

const FORMATTED_MAX_LENGTH: Record<InputMask, number> = {
  cpf: 14,
  cnpj: 18,
  cep: 9,
  phone: 15,
};

function formatCpf(digits: string): string {
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);

  let out = p1;
  if (p2) out += '.' + p2;
  if (p3) out += '.' + p3;
  if (p4) out += '-' + p4;
  return out;
}

function formatCnpj(digits: string): string {
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);

  let out = p1;
  if (p2) out += '.' + p2;
  if (p3) out += '.' + p3;
  if (p4) out += '/' + p4;
  if (p5) out += '-' + p5;
  return out;
}

function formatCep(digits: string): string {
  const p1 = digits.slice(0, 5);
  const p2 = digits.slice(5, 8);
  return p2 ? `${p1}-${p2}` : p1;
}

function formatPhone(digits: string): string {
  if (!digits) {
    return '';
  }

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  const isMobile = digits.length > 10;
  const splitIndex = isMobile ? 5 : 4;
  const localFirst = local.slice(0, splitIndex);
  const localSecond = local.slice(splitIndex);

  let out = `(${ddd}`;
  if (digits.length > 2) {
    out += `) ${localFirst}`;
  }
  if (localSecond) {
    out += `-${localSecond}`;
  }
  return out;
}

const FORMATTERS: Record<InputMask, (digits: string) => string> = {
  cpf: formatCpf,
  cnpj: formatCnpj,
  cep: formatCep,
  phone: formatPhone,
};

export function rawMaxLength(mask: InputMask): number {
  return RAW_MAX_LENGTH[mask];
}

export function formattedMaxLength(mask: InputMask): number {
  return FORMATTED_MAX_LENGTH[mask];
}

export function toRawDigits(mask: InputMask, value: string): string {
  return (value ?? '').replace(/\D/g, '').slice(0, RAW_MAX_LENGTH[mask]);
}

export function formatMasked(mask: InputMask, rawDigits: string): string {
  return FORMATTERS[mask](rawDigits);
}
