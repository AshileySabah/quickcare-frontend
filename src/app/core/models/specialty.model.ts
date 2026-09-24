import { ProfessionalCategory } from './user.model';

export interface Specialty {
  id: string;
  name: string;
  category: ProfessionalCategory;
}

export interface ProfessionalCategoryInfo {
  value: ProfessionalCategory;
  label: string;
  registrationLabel: string | null;
}
