import { PracticeArea } from './practice-area.model';
import { RatingSummary } from './rating.model';
import { AttendanceModality, EmergencyContact } from './user.model';

export interface ProfessionalPublicProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  practiceAreas: PracticeArea[];
  attendanceModality: AttendanceModality;
  city: string;
  state: string;
  memberSince: string;
  completedServices: number;
  ratings: RatingSummary;
  emergencyContacts?: EmergencyContact[];
}

export interface PatientHealthInfo {
  allergies?: string;
  healthConditions?: string;
  medicationsInUse?: string;
}

export interface PatientPublicProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  age: number;
  city: string;
  state: string;
  memberSince: string;
  ratings: RatingSummary;
  health?: PatientHealthInfo;
  emergencyContacts?: EmergencyContact[];
}
