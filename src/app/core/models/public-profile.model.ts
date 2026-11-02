import { AttendanceModality, EmergencyContact, ProfessionalCategory } from './user.model';

/** O que outros usuários veem do profissional; sem telefone, e-mail nem endereço. */
export interface ProfessionalPublicProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  category: ProfessionalCategory;
  categoryLabel: string;
  specialties: string[];
  /** Sigla do conselho (CRM, COREN...); nula para cuidadores. */
  registrationLabel: string | null;
  registrationNumber?: string;
  registrationUf?: string;
  attendanceModality: AttendanceModality;
  city: string;
  state: string;
  memberSince: string;
  completedServices: number;
  /** Só para o paciente cujo atendimento com ele já começou. */
  emergencyContacts?: EmergencyContact[];
}

/** Visível ao profissional com proposta aceita, enquanto a solicitação está em curso. */
export interface PatientHealthInfo {
  allergies?: string;
  healthConditions?: string;
  medicationsInUse?: string;
}

/** O que o profissional com proposta aceita vê do paciente. */
export interface PatientPublicProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  age: number;
  city: string;
  state: string;
  memberSince: string;
  health?: PatientHealthInfo;
  /** Só depois que o atendimento começou. */
  emergencyContacts?: EmergencyContact[];
}
