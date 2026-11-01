import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Address,
  Admin,
  EmergencyContact,
  Gender,
  IdentityDocumentType,
  Patient,
  Professional,
  ProfessionalCategory,
  ProfileSummary,
  RegistrationDocument,
  AttendanceModality,
  SwitchableRole,
  User,
  UserRole,
  ValidationStatus,
} from '../models';
import {
  CadastroApiResponse,
  LoginApiResponse,
  MensagemApiResponse,
  PerfilStatusApi,
  RedefinirSenhaApiResponse,
} from './auth-api.model';
import { normalizeError } from '../http/api-error';

/** Documento oficial com foto conferido na etapa de identidade. */
export interface IdentityDocumentInput {
  identityDocumentType: IdentityDocumentType;
  identityDocumentNumber: string;
  identityDocumentUf?: string;
}

/** Dados da conta, informados só no primeiro cadastro. */
interface AccountInput extends IdentityDocumentInput {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
  avatar?: Blob;
}

/** Dados do perfil de paciente; quem já tem conta cria o perfil só com eles. */
export interface PatientProfileInput {
  birthDate: string;
  gender: Gender;
  emergencyContacts: EmergencyContact[];
  infoConfirmedTrue: boolean;
  lgpdConsent: boolean;
  allergies?: string;
  healthConditions?: string;
  medicationsInUse?: string;
  address: Address;
  documents: RegistrationDocument[];
}

/** Dados do perfil de profissional; quem já tem conta cria o perfil só com eles. */
export interface ProfessionalProfileInput {
  cnpj?: string;
  category: ProfessionalCategory;
  specialtyIds: string[];
  registrationNumber?: string;
  registrationUf?: string;
  birthDate: string;
  gender: Gender;
  emergencyContacts: EmergencyContact[];
  infoConfirmedTrue: boolean;
  lgpdConsent: boolean;
  hasLiabilityInsurance: boolean;
  modalidadeAtendimento: AttendanceModality;
  raioAtendimentoKm?: number;
  address: Address;
  documents: RegistrationDocument[];
}

export interface PatientRegistration extends AccountInput, PatientProfileInput {}

export interface ProfessionalRegistration extends AccountInput, ProfessionalProfileInput {}

export class InvalidPasswordResetLinkError extends Error {}

interface Session {
  user: User;
  profiles: ProfileSummary[];
}

const ROLE_BY_TIPO = { PACIENTE: 'patient', PROFISSIONAL: 'professional' } as const;
const TIPO_BY_ROLE = { patient: 'PACIENTE', professional: 'PROFISSIONAL' } as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly role = computed<UserRole | null>(
    () => this.currentUserSignal()?.role ?? null,
  );

  private readonly profilesSignal = signal<ProfileSummary[]>([]);
  /** Perfis de paciente/profissional do usuário (vazio para o admin). */
  readonly profiles = this.profilesSignal.asReadonly();

  /** Tentativa única de recuperar a sessão pelos cookies, compartilhada entre os guards. */
  private sessionRestore$?: Observable<User | null>;

  /**
   * A sessão vive em memória e some ao recarregar a página, mas os cookies
   * HttpOnly continuam lá: na primeira navegação protegida, busca o usuário em
   * /auth/me (renovando o access token se ele já expirou). Depois disso, só
   * devolve o usuário atual — logout continua valendo sem nova consulta.
   */
  ensureSession(): Observable<User | null> {
    const user = this.currentUserSignal();
    if (user) {
      return of(user);
    }

    this.sessionRestore$ ??= this.fetchCurrentSession().pipe(shareReplay(1));
    return this.sessionRestore$.pipe(map(() => this.currentUserSignal()));
  }

  private fetchCurrentSession(): Observable<User | null> {
    const me$ = this.http.get<LoginApiResponse>(`${environment.apiUrl}/auth/me`);

    return me$.pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 401
          ? this.http
              .post<void>(`${environment.apiUrl}/auth/refresh`, {})
              .pipe(switchMap(() => me$))
          : throwError(() => error),
      ),
      map((response) => this.startSession(response)),
      catchError(() => of(null)),
    );
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<LoginApiResponse>(
        `${environment.apiUrl}/auth/login`,
        { email, senha: password },
        { withCredentials: true },
      )
      .pipe(
        map((response) => this.startSession(response)),
        catchError((error: unknown) =>
          throwError(() =>
            normalizeError(
              error,
              'Não foi possível entrar. Tente novamente.',
            ),
          ),
        ),
      );
  }

  /** Troca o perfil ativo sem sair da conta; o back guarda a escolha para o próximo login. */
  switchProfile(role: SwitchableRole): Observable<User> {
    const user = this.currentUserSignal();
    if (user?.role === role) {
      return of(user);
    }

    return this.http
      .patch<LoginApiResponse>(`${environment.apiUrl}/auth/perfil-ativo`, { perfil: TIPO_BY_ROLE[role] })
      .pipe(
        map((response) => this.startSession(response)),
        catchError((error: unknown) =>
          throwError(() => normalizeError(error, 'Não foi possível trocar de perfil. Tente novamente.')),
        ),
      );
  }

  requestPasswordReset(email: string): Observable<string> {
    return this.http
      .post<MensagemApiResponse>(`${environment.apiUrl}/auth/senha/esqueci`, {
        email,
      })
      .pipe(
        map((response) => response.mensagem),
        catchError((error: unknown) =>
          throwError(() =>
            normalizeError(
              error,
              'Não foi possível enviar o link. Tente novamente.',
            ),
          ),
        ),
      );
  }

  validatePasswordResetToken(token: string): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/auth/senha/validar-token`, { token })
      .pipe(
        map(() => undefined),
        catchError((error: unknown) =>
          throwError(() =>
            this.normalizePasswordResetError(
              error,
              'Não foi possível verificar o link. Tente novamente.',
            ),
          ),
        ),
      );
  }

  resetPassword(
    token: string,
    newPassword: string,
  ): Observable<{ message: string; user: User }> {
    return this.http
      .post<RedefinirSenhaApiResponse>(
        `${environment.apiUrl}/auth/senha/redefinir`,
        { token, novaSenha: newPassword },
      )
      .pipe(
        map((response) => ({
          message: response.mensagem,
          user: this.startSession(response.usuario),
        })),
        catchError((error: unknown) =>
          throwError(() =>
            this.normalizePasswordResetError(
              error,
              'Não foi possível redefinir a senha. Tente novamente.',
            ),
          ),
        ),
      );
  }

  private normalizePasswordResetError(
    error: unknown,
    defaultMessage: string,
  ): Error {
    const normalized = normalizeError(error, defaultMessage);

    if (error instanceof HttpErrorResponse && error.status === 410) {
      return new InvalidPasswordResetLinkError(normalized.message);
    }
    return normalized;
  }

  private startSession(response: LoginApiResponse): User {
    const session = this.toSession(response);
    this.currentUserSignal.set(session.user);
    this.profilesSignal.set(session.profiles);
    return session.user;
  }

  /**
   * Abre no último perfil usado, se ainda estiver ativo; senão, no primeiro
   * ativo pela prioridade (o admin nunca tem outro perfil).
   */
  private toSession(response: LoginApiResponse): Session {
    const ativos = response.perfis.filter((perfil) => perfil.status === 'ATIVO');
    const prioridade: PerfilStatusApi['tipo'][] = ['ADMIN', 'PROFISSIONAL', 'PACIENTE'];
    const perfilAtivo =
      ativos.find((perfil) => perfil.tipo === 'ADMIN') ??
      ativos.find((perfil) => perfil.tipo === response.ultimoPerfil) ??
      prioridade.map((tipo) => ativos.find((perfil) => perfil.tipo === tipo)).find((perfil) => !!perfil);

    if (!perfilAtivo) {
      throw new Error('Nenhum dos seus perfis está ativo no momento.');
    }

    const profiles: ProfileSummary[] = response.perfis
      .filter((perfil): perfil is PerfilStatusApi & { tipo: 'PACIENTE' | 'PROFISSIONAL' } => perfil.tipo !== 'ADMIN')
      .map((perfil) => ({
        role: ROLE_BY_TIPO[perfil.tipo],
        banned: perfil.status === 'BANIDO',
        validationStatus: toValidationStatus(perfil),
      }));

    return { user: this.toUser(response, perfilAtivo), profiles };
  }

  private toUser(response: LoginApiResponse, perfilAtivo: PerfilStatusApi): User {
    const id = String(response.usuarioId);
    const emptyAddress: Address = {
      cep: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
    };

    if (perfilAtivo.tipo === 'ADMIN') {
      const admin: Admin = {
        id,
        role: 'admin',
        name: response.nome,
        email: response.email,
        avatarUrl: response.avatarUrl ?? undefined,
      };
      return admin;
    }

    const validationStatus = toValidationStatus(perfilAtivo);

    if (perfilAtivo.tipo === 'PROFISSIONAL') {
      const professional: Professional = {
        id,
        role: 'professional',
        name: response.nome,
        email: response.email,
        avatarUrl: response.avatarUrl ?? undefined,
        phone: '',
        cpf: '',
        category: 'OUTRO',
        specialtyIds: [],
        birthDate: '',
        gender: 'PREFIRO_NAO_INFORMAR',
        emergencyContacts: [],
        infoConfirmedTrue: true,
        lgpdConsent: true,
        hasLiabilityInsurance: false,
        address: emptyAddress,
        validationStatus,
      };
      return professional;
    }

    const patient: Patient = {
      id,
      role: 'patient',
      name: response.nome,
      email: response.email,
      avatarUrl: response.avatarUrl ?? undefined,
      phone: '',
      cpf: '',
      birthDate: '',
      gender: 'PREFIRO_NAO_INFORMAR',
      emergencyContacts: [],
      infoConfirmedTrue: true,
      lgpdConsent: true,
      address: emptyAddress,
      validationStatus,
    };
    return patient;
  }


  registerPatient(input: PatientRegistration): Observable<User> {
    const dados = { ...accountPayload(input), ...patientProfilePayload(input) };

    return this.http
      .post<CadastroApiResponse>(
        `${environment.apiUrl}/usuarios/cadastro/paciente`,
        toFormData(dados, input.documents, input.avatar),
        { withCredentials: true },
      )
      .pipe(
        switchMap(() => this.login(input.email, input.password)),
        catchError((error: unknown) =>
          throwError(() =>
            normalizeError(
              error,
              'Não foi possível concluir o cadastro. Tente novamente.',
            ),
          ),
        ),
      );
  }

  registerProfessional(input: ProfessionalRegistration): Observable<User> {
    const dados = { ...accountPayload(input), ...professionalProfilePayload(input) };

    return this.http
      .post<CadastroApiResponse>(
        `${environment.apiUrl}/usuarios/cadastro/profissional`,
        toFormData(dados, input.documents, input.avatar),
        { withCredentials: true },
      )
      .pipe(
        switchMap(() => this.login(input.email, input.password)),
        catchError((error: unknown) =>
          throwError(() =>
            normalizeError(
              error,
              'Não foi possível concluir o cadastro. Tente novamente.',
            ),
          ),
        ),
      );
  }

  /** Quem já está logado cria o outro perfil, que já passa a ser o ativo. */
  createPatientProfile(input: PatientProfileInput): Observable<User> {
    return this.createProfile('paciente', toFormData(patientProfilePayload(input), input.documents));
  }

  createProfessionalProfile(input: ProfessionalProfileInput): Observable<User> {
    return this.createProfile('profissional', toFormData(professionalProfilePayload(input), input.documents));
  }

  private createProfile(tipo: 'paciente' | 'profissional', formData: FormData): Observable<User> {
    return this.http.post<LoginApiResponse>(`${environment.apiUrl}/perfis/${tipo}`, formData).pipe(
      map((response) => this.startSession(response)),
      catchError((error: unknown) =>
        throwError(() => normalizeError(error, 'Não foi possível criar o perfil. Tente novamente.')),
      ),
    );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(
        `${environment.apiUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap(() => this.clearSession()),
        catchError(() => {
          this.clearSession();
          return of(undefined);
        }),
      );
  }

  /** Atualiza o status depois de um reenvio, sem precisar entrar de novo. */
  updateValidationStatus(validationStatus: ValidationStatus): void {
    const user = this.currentUserSignal();
    if (!user || user.role === 'admin') {
      return;
    }

    this.currentUserSignal.set({ ...user, validationStatus });
    this.profilesSignal.update((profiles) =>
      profiles.map((profile) => (profile.role === user.role ? { ...profile, validationStatus } : profile)),
    );
  }

  updateCurrentUser(name: string, avatarUrl: string | null): void {
    this.currentUserSignal.update((user) =>
      user ? { ...user, name, avatarUrl: avatarUrl ?? undefined } : user,
    );
  }

  private clearSession(): void {
    this.currentUserSignal.set(null);
    this.profilesSignal.set([]);
  }
}

function toValidationStatus(perfil: PerfilStatusApi): ValidationStatus {
  return (perfil.statusValidacao?.toLowerCase() ?? 'aprovado') as ValidationStatus;
}

function accountPayload(input: AccountInput) {
  return {
    nome: input.name,
    email: input.email,
    senha: input.password,
    cpf: input.cpf,
    telefone: input.phone,
    documentoIdentidadeTipo: input.identityDocumentType,
    documentoIdentidadeNumero: input.identityDocumentNumber,
    documentoIdentidadeUf: input.identityDocumentType === 'RG' ? input.identityDocumentUf : undefined,
  };
}

function profileBasePayload(input: PatientProfileInput | ProfessionalProfileInput) {
  return {
    dataNascimento: input.birthDate,
    genero: input.gender,
    contatosEmergencia: input.emergencyContacts.map((contact) => ({
      nome: contact.name,
      telefone: contact.phone,
    })),
    confirmacaoInformacoesVerdadeiras: input.infoConfirmedTrue,
    consentimentoLgpd: input.lgpdConsent,
    cep: input.address.cep,
    logradouro: input.address.street,
    numero: input.address.number,
    complemento: input.address.complement || undefined,
    bairro: input.address.neighborhood,
    cidade: input.address.city,
    uf: input.address.state,
  };
}

function patientProfilePayload(input: PatientProfileInput) {
  return {
    ...profileBasePayload(input),
    alergias: input.allergies || undefined,
    condicoesSaude: input.healthConditions || undefined,
    medicamentosEmUso: input.medicationsInUse || undefined,
  };
}

function professionalProfilePayload(input: ProfessionalProfileInput) {
  return {
    ...profileBasePayload(input),
    cnpj: input.cnpj || undefined,
    categoria: input.category,
    especialidadeIds: input.specialtyIds.map(Number),
    registroProfissional: input.registrationNumber || undefined,
    registroProfissionalUf: input.registrationUf || undefined,
    possuiSeguroResponsabilidadeCivil: input.hasLiabilityInsurance,
    modalidadeAtendimento: input.modalidadeAtendimento,
    raioAtendimentoKm: input.raioAtendimentoKm,
  };
}

/**
 * O back amarra cada arquivo ao tipo pela posição: `documentos[i]` é do tipo
 * `tiposDocumento[i]`.
 */
function toFormData(dados: object, documents: RegistrationDocument[], avatar?: Blob): FormData {
  const formData = new FormData();
  formData.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }));

  for (const document of documents) {
    formData.append('documentos', document.file, document.file.name);
    formData.append('tiposDocumento', document.type);
  }

  if (avatar) {
    formData.append('avatar', avatar, 'avatar.jpg');
  }

  return formData;
}
