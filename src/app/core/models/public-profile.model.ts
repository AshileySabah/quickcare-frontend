import { AttendanceModality, EmergencyContact, ProfessionalCategory } from './user.model';

export interface ProfessionalPublicProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  category: ProfessionalCategory;
  categoryLabel: string;
  specialties: string[];
  registrationLabel: string | null;
  registrationNumber?: string;
  registrationUf?: string;
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
