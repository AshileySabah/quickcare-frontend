import { PracticeArea } from './practice-area.model';
import { RatingSummary } from './rating.model';
import { AttendanceModality, ProfessionalCategory } from './user.model';

export type PublicModality = 'presencial' | 'online';

export interface PublicSearchFilters {
  category?: ProfessionalCategory;
  specialtyId?: string;
  city?: string;
  state?: string;
  modality?: PublicModality;
  minRating?: number;
}

export interface PublicProfessional {
  id: string;
  name: string;
  avatarUrl?: string;
  practiceAreas: PracticeArea[];
  attendanceModality: AttendanceModality;
  city: string;
  state: string;
  completedServices: number;
  ratings: RatingSummary;
}

export interface PublicRequestSlot {
  categoryLabel: string;
  specialties: string[];
  quantity: number;
  openSlots: number;
}

export interface PublicRequest {
  id: string;
  modality: PublicModality;
  city?: string;
  state?: string;
  desiredDeadline: string;
  createdAt: string;
  slots: PublicRequestSlot[];
}
