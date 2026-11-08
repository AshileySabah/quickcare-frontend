import { PracticeArea } from './practice-area.model';
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
  health?: PatientHealthInfo;
  emergencyContacts?: EmergencyContact[];
}
