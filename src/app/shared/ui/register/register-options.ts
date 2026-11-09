import { SelectOption } from '../forms/select/select.component';

export const GENDER_OPTIONS: SelectOption[] = [
  { value: 'FEMININO', label: 'Feminino' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'OUTRO', label: 'Outro' },
  { value: 'PREFIRO_NAO_INFORMAR', label: 'Prefiro não informar' },
];

export const IDENTITY_DOCUMENT_OPTIONS: SelectOption[] = [
  { value: 'RG', label: 'RG' },
  { value: 'CNH', label: 'CNH' },
];
