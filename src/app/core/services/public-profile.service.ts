import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import {
  AttendanceModality,
  EmergencyContact,
  PatientPublicProfile,
  ProfessionalCategory,
  ProfessionalPublicProfile,
} from '../models';

interface PerfilPublicoProfissionalApi {
  id: number;
  nome: string;
  avatarUrl: string | null;
  categoria: ProfessionalCategory;
  categoriaRotulo: string;
  especialidades: string[];
  siglaRegistro: string | null;
  registroProfissional: string | null;
  registroProfissionalUf: string | null;
  modalidadeAtendimento: AttendanceModality;
  cidade: string;
  uf: string;
  membroDesde: string;
  atendimentosConcluidos: number;
  contatosEmergencia?: ContatoEmergenciaApi[];
  bloqueioId?: number;
}

interface ContatoEmergenciaApi {
  nome: string;
  telefone: string;
}

interface PerfilPublicoPacienteApi {
  id: number;
  nome: string;
  avatarUrl: string | null;
  idade: number;
  cidade: string;
  uf: string;
  membroDesde: string;
  saude?: {
    alergias: string | null;
    condicoesSaude: string | null;
    medicamentosEmUso: string | null;
  };
  contatosEmergencia?: ContatoEmergenciaApi[];
  bloqueioId?: number;
}

@Injectable({ providedIn: 'root' })
export class PublicProfileService {
  private readonly http = inject(HttpClient);

  getProfessional(id: string): Observable<ProfessionalPublicProfile | undefined> {
    return this.http
      .get<PerfilPublicoProfissionalApi>(`${environment.apiUrl}/profissionais/${id}/perfil`)
      .pipe(map(toProfessionalProfile), catchError(notFoundAsUndefined('Não foi possível carregar o perfil.')));
  }

  getPatient(id: string): Observable<PatientPublicProfile | undefined> {
    return this.http
      .get<PerfilPublicoPacienteApi>(`${environment.apiUrl}/pacientes/${id}/perfil`)
      .pipe(map(toPatientProfile), catchError(notFoundAsUndefined('Não foi possível carregar o perfil.')));
  }
}

function notFoundAsUndefined(defaultMessage: string) {
  return (error: unknown): Observable<undefined> =>
    error instanceof HttpErrorResponse && error.status === 404
      ? of(undefined)
      : throwError(() => normalizeError(error, defaultMessage));
}

function toProfessionalProfile(api: PerfilPublicoProfissionalApi): ProfessionalPublicProfile {
  return {
    id: String(api.id),
    name: api.nome,
    avatarUrl: api.avatarUrl ?? undefined,
    category: api.categoria,
    categoryLabel: api.categoriaRotulo,
    specialties: api.especialidades,
    registrationLabel: api.siglaRegistro,
    registrationNumber: api.registroProfissional ?? undefined,
    registrationUf: api.registroProfissionalUf ?? undefined,
    attendanceModality: api.modalidadeAtendimento,
    city: api.cidade,
    state: api.uf,
    memberSince: api.membroDesde,
    completedServices: api.atendimentosConcluidos,
    emergencyContacts: toContacts(api.contatosEmergencia),
    blockId: api.bloqueioId ? String(api.bloqueioId) : undefined,
  };
}

function toPatientProfile(api: PerfilPublicoPacienteApi): PatientPublicProfile {
  return {
    id: String(api.id),
    name: api.nome,
    avatarUrl: api.avatarUrl ?? undefined,
    age: api.idade,
    city: api.cidade,
    state: api.uf,
    memberSince: api.membroDesde,
    health: api.saude && {
      allergies: api.saude.alergias ?? undefined,
      healthConditions: api.saude.condicoesSaude ?? undefined,
      medicationsInUse: api.saude.medicamentosEmUso ?? undefined,
    },
    emergencyContacts: toContacts(api.contatosEmergencia),
    blockId: api.bloqueioId ? String(api.bloqueioId) : undefined,
  };
}

function toContacts(contacts: ContatoEmergenciaApi[] | undefined): EmergencyContact[] | undefined {
  return contacts?.map((contact) => ({ name: contact.nome, phone: contact.telefone }));
}
