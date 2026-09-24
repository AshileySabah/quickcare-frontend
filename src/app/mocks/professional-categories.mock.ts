import { ProfessionalCategoryInfo } from '../core/models';

export const PROFESSIONAL_CATEGORIES_MOCK: ProfessionalCategoryInfo[] = [
  { value: 'MEDICO', label: 'Médico(a)', registrationLabel: 'CRM' },
  { value: 'ENFERMEIRO', label: 'Enfermeiro(a)', registrationLabel: 'COREN' },
  { value: 'OUTRO', label: 'Outros profissionais', registrationLabel: 'Registro profissional' },
  { value: 'CUIDADOR', label: 'Cuidador(a)', registrationLabel: null },
];
