import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { AuthService } from '../auth/auth.service';
import { Address, AttendanceModality, EmergencyContact, Gender, ProfessionalCategory } from '../models';

export interface ProfileDeclarations {
  infoConfirmedTrue: boolean;
  lgpdConsent: boolean;
}

export interface ProfessionalRegistration {
  category: ProfessionalCategory;
  specialtyIds: string[];
  registrationNumber: string;
  registrationUf: string;
}

interface BaseProfile {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  birthDate: string;
  gender: Gender;
  emergencyContacts: EmergencyContact[];
  address: Address;
  declarations: ProfileDeclarations;
}

export interface PatientProfile extends BaseProfile {
  allergies: string;
  healthConditions: string;
  medicationsInUse: string;
}

export interface ProfessionalProfile extends BaseProfile {
  hasLiabilityInsurance: boolean;
  modalidadeAtendimento: AttendanceModality;
  raioAtendimentoKm: number | null;
  registration: ProfessionalRegistration;
}

interface BaseProfileUpdate {
  name: string;
  phone: string;
  emergencyContacts: EmergencyContact[];
  address: Address;
  avatar?: Blob;
  removeAvatar: boolean;
}

export interface PatientProfileUpdate extends BaseProfileUpdate {
  allergies?: string;
  healthConditions?: string;
  medicationsInUse?: string;
}

export interface ProfessionalProfileUpdate extends BaseProfileUpdate {
  hasLiabilityInsurance: boolean;
  modalidadeAtendimento: AttendanceModality;
  raioAtendimentoKm?: number;
}

export interface ProfileUpdateResult<T> {
  message: string;
  profile: T;
}

interface BasePerfilApi {
  nome: string;
  email: string;
  telefone: string | null;
  avatarUrl: string | null;
  dataNascimento: string;
  genero: Gender;
  contatosEmergencia: { nome: string; telefone: string }[];
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  declaracoes?: { confirmacaoInformacoesVerdadeiras: boolean; consentimentoLgpd: boolean };
}

interface RegistroApi {
  categoria: ProfessionalCategory;
  especialidadeIds: number[];
  registroProfissional: string | null;
  registroProfissionalUf: string | null;
}

interface PerfilPacienteApi extends BasePerfilApi {
  alergias: string | null;
  condicoesSaude: string | null;
  medicamentosEmUso: string | null;
}

interface PerfilProfissionalApi extends BasePerfilApi {
  possuiSeguroResponsabilidadeCivil: boolean;
  modalidadeAtendimento: AttendanceModality;
  raioAtendimentoKm: number | null;
  registro?: RegistroApi;
}

interface PerfilAtualizadoApi<T> {
  mensagem: string;
  perfil: T;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/perfil`;

  getPatientProfile(): Observable<PatientProfile> {
    return this.http.get<PerfilPacienteApi>(`${this.baseUrl}/paciente`).pipe(
      map(toPatientProfile),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar seus dados.'))),
    );
  }

  updatePatientProfile(input: PatientProfileUpdate): Observable<ProfileUpdateResult<PatientProfile>> {
    const dados = {
      ...toBaseDados(input),
      alergias: input.allergies || undefined,
      condicoesSaude: input.healthConditions || undefined,
      medicamentosEmUso: input.medicationsInUse || undefined,
    };

    return this.http
      .put<PerfilAtualizadoApi<PerfilPacienteApi>>(`${this.baseUrl}/paciente`, toFormData(dados, input.avatar))
      .pipe(
        map((response) => ({ message: response.mensagem, profile: toPatientProfile(response.perfil) })),
        tap(({ profile }) => this.authService.updateCurrentUser(profile.name, profile.avatarUrl)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível salvar seus dados.'))),
      );
  }

  getProfessionalProfile(): Observable<ProfessionalProfile> {
    return this.http.get<PerfilProfissionalApi>(`${this.baseUrl}/profissional`).pipe(
      map(toProfessionalProfile),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar seus dados.'))),
    );
  }

  updateProfessionalProfile(input: ProfessionalProfileUpdate): Observable<ProfileUpdateResult<ProfessionalProfile>> {
    const dados = {
      ...toBaseDados(input),
      possuiSeguroResponsabilidadeCivil: input.hasLiabilityInsurance,
      modalidadeAtendimento: input.modalidadeAtendimento,
      raioAtendimentoKm: input.raioAtendimentoKm,
    };

    return this.http
      .put<PerfilAtualizadoApi<PerfilProfissionalApi>>(`${this.baseUrl}/profissional`, toFormData(dados, input.avatar))
      .pipe(
        map((response) => ({ message: response.mensagem, profile: toProfessionalProfile(response.perfil) })),
        tap(({ profile }) => this.authService.updateCurrentUser(profile.name, profile.avatarUrl)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível salvar seus dados.'))),
      );
  }
}

function toBaseProfile(api: BasePerfilApi): BaseProfile {
  return {
    name: api.nome,
    email: api.email,
    phone: api.telefone ?? '',
    avatarUrl: api.avatarUrl,
    birthDate: api.dataNascimento,
    gender: api.genero,
    emergencyContacts: api.contatosEmergencia.map((contato) => ({ name: contato.nome, phone: contato.telefone })),
    address: {
      cep: api.cep,
      street: api.logradouro,
      number: api.numero,
      complement: api.complemento ?? '',
      neighborhood: api.bairro,
      city: api.cidade,
      state: api.uf,
    },
    declarations: {
      infoConfirmedTrue: api.declaracoes?.confirmacaoInformacoesVerdadeiras ?? false,
      lgpdConsent: api.declaracoes?.consentimentoLgpd ?? false,
    },
  };
}

function toRegistration(api: RegistroApi | undefined): ProfessionalRegistration {
  return {
    category: api?.categoria ?? ('' as ProfessionalCategory),
    specialtyIds: (api?.especialidadeIds ?? []).map(String),
    registrationNumber: api?.registroProfissional ?? '',
    registrationUf: api?.registroProfissionalUf ?? '',
  };
}

function toPatientProfile(api: PerfilPacienteApi): PatientProfile {
  return {
    ...toBaseProfile(api),
    allergies: api.alergias ?? '',
    healthConditions: api.condicoesSaude ?? '',
    medicationsInUse: api.medicamentosEmUso ?? '',
  };
}

function toProfessionalProfile(api: PerfilProfissionalApi): ProfessionalProfile {
  return {
    ...toBaseProfile(api),
    hasLiabilityInsurance: api.possuiSeguroResponsabilidadeCivil,
    modalidadeAtendimento: api.modalidadeAtendimento,
    raioAtendimentoKm: api.raioAtendimentoKm,
    registration: toRegistration(api.registro),
  };
}

function toBaseDados(input: BaseProfileUpdate) {
  return {
    nome: input.name,
    telefone: input.phone,
    contatosEmergencia: input.emergencyContacts.map((contact) => ({ nome: contact.name, telefone: contact.phone })),
    cep: input.address.cep,
    logradouro: input.address.street,
    numero: input.address.number,
    complemento: input.address.complement || undefined,
    bairro: input.address.neighborhood,
    cidade: input.address.city,
    uf: input.address.state,
    removerAvatar: input.removeAvatar,
  };
}

function toFormData(dados: object, avatar?: Blob): FormData {
  const formData = new FormData();
  formData.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }));

  if (avatar) {
    formData.append('avatar', avatar, 'avatar.jpg');
  }

  return formData;
}
