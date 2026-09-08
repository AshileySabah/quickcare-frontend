import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Patient, Professional, ProfessionalDocument, User, UserRole } from '../models';
import { ADMINS_MOCK, PATIENTS_MOCK, PROFESSIONALS_MOCK } from '../../mocks';
import { simulateNetwork } from '../services/simulate-network.util';
import { ApiErrorResponse, CadastroApiResponse, LoginApiResponse, PerfilStatusApi } from './auth-api.model';

export interface PatientRegistration {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
}

export interface ProfessionalRegistration {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  specialtyId: string;
  registrationNumber: string;
  password: string;
  document: ProfessionalDocument;
  modalidadeAtendimento: 'PRESENCIAL' | 'REMOTO' | 'AMBOS';
  raioAtendimentoKm: number;
  latitude: number;
  longitude: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly users = signal<User[]>([...PATIENTS_MOCK, ...PROFESSIONALS_MOCK, ...ADMINS_MOCK]);

  private readonly currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly role = computed<UserRole | null>(() => this.currentUserSignal()?.role ?? null);

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<LoginApiResponse>(`${environment.apiUrl}/auth/login`, { email, senha: password }, { withCredentials: true })
      .pipe(
        map((response) => this.mapLoginResponseToUser(response)),
        tap((user) => this.establishSession(user)),
        catchError((error: unknown) =>
          throwError(() => this.normalizeError(error, 'Não foi possível entrar. Tente novamente.')),
        ),
      );
  }

  private mapLoginResponseToUser(response: LoginApiResponse): User {
    const prioridade: PerfilStatusApi['tipo'][] = ['PROFISSIONAL', 'PACIENTE'];
    const perfilAtivo = prioridade
      .map((tipo) => response.perfis.find((perfil) => perfil.tipo === tipo))
      .find((perfil) => perfil?.status === 'ATIVO');

    if (!perfilAtivo) {
      throw new Error('Nenhum dos seus perfis está ativo no momento.');
    }

    const id = String(response.usuarioId);

    if (perfilAtivo.tipo === 'PROFISSIONAL') {
      const professional: Professional = {
        id,
        role: 'professional',
        name: response.nome,
        email: response.email,
        phone: '',
        cpf: '',
        specialtyId: '',
        registrationNumber: '',
        validationStatus: 'aprovado',
        validationDocument: { fileName: '', fileType: '', fileSizeBytes: 0, uploadedAt: '', previewUrl: '' },
      };
      return professional;
    }

    const patient: Patient = {
      id,
      role: 'patient',
      name: response.nome,
      email: response.email,
      phone: '',
      cpf: '',
    };
    return patient;
  }

  private normalizeError(error: unknown, defaultMessage: string): Error {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error as ApiErrorResponse | undefined;
      return new Error(apiError?.message ?? defaultMessage);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(defaultMessage);
  }

  registerPatient(input: PatientRegistration): Observable<User> {
    return this.http
      .post<CadastroApiResponse>(
        `${environment.apiUrl}/usuarios/cadastro/paciente`,
        { nome: input.name, email: input.email, senha: input.password, cpf: input.cpf, telefone: input.phone },
        { withCredentials: true },
      )
      .pipe(
        switchMap(() => this.login(input.email, input.password)),
        catchError((error: unknown) =>
          throwError(() => this.normalizeError(error, 'Não foi possível concluir o cadastro. Tente novamente.')),
        ),
      );
  }

  registerProfessional(input: ProfessionalRegistration): Observable<User> {
    return this.http
      .post<CadastroApiResponse>(
        `${environment.apiUrl}/usuarios/cadastro/profissional`,
        {
          nome: input.name,
          email: input.email,
          senha: input.password,
          cpf: input.cpf,
          telefone: input.phone,
          modalidadeAtendimento: input.modalidadeAtendimento,
          raioAtendimentoKm: input.raioAtendimentoKm,
          latitude: input.latitude,
          longitude: input.longitude,
        },
        { withCredentials: true },
      )
      .pipe(
        switchMap(() => this.login(input.email, input.password)),
        catchError((error: unknown) =>
          throwError(() => this.normalizeError(error, 'Não foi possível concluir o cadastro. Tente novamente.')),
        ),
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.currentUserSignal.set(null)),
      catchError(() => {
        this.currentUserSignal.set(null);
        return of(undefined);
      }),
    );
  }

  listPendingProfessionals(simulateError = false): Observable<Professional[]> {
    return simulateNetwork(
      () =>
        this.users().filter(
          (user): user is Professional => user.role === 'professional' && user.validationStatus === 'pendente',
        ),
      { simulateError, errorMessage: 'Não foi possível carregar os profissionais pendentes.' },
    );
  }

  getProfessionalById(id: string, simulateError = false): Observable<Professional | undefined> {
    return simulateNetwork(
      () => {
        const user = this.users().find((candidate) => candidate.id === id);
        return user && user.role === 'professional' ? user : undefined;
      },
      { simulateError, errorMessage: 'Não foi possível carregar o profissional.' },
    );
  }

  approveProfessional(id: string): Observable<Professional> {
    return simulateNetwork(() => {
      const professional = this.findPendingProfessionalOrThrow(id);
      const updated: Professional = { ...professional, validationStatus: 'aprovado', rejectionReason: undefined };
      this.replaceUser(updated);
      return updated;
    });
  }

  rejectProfessional(id: string, reason: string): Observable<Professional> {
    return simulateNetwork(() => {
      const professional = this.findPendingProfessionalOrThrow(id);
      const updated: Professional = { ...professional, validationStatus: 'reprovado', rejectionReason: reason };
      this.replaceUser(updated);
      return updated;
    });
  }

  private findPendingProfessionalOrThrow(id: string): Professional {
    const user = this.users().find((candidate) => candidate.id === id);

    if (!user || user.role !== 'professional') {
      throw new Error('Profissional não encontrado.');
    }

    if (user.validationStatus !== 'pendente') {
      throw new Error('Este profissional já foi avaliado.');
    }

    return user;
  }

  private replaceUser(updated: User): void {
    this.users.update((users) => users.map((user) => (user.id === updated.id ? updated : user)));

    if (this.currentUserSignal()?.id === updated.id) {
      this.currentUserSignal.set(updated);
    }
  }

  private establishSession(user: User): void {
    this.currentUserSignal.set(user);
  }
}
