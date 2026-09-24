import { ProfessionalCategory } from './user.model';

export interface Specialty {
  id: string;
  name: string;
  category: ProfessionalCategory;
}
