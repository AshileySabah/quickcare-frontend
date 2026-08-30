import { Injectable, computed, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { Patient, Professional, ProfessionalDocument, User, UserRole } from '../models';
import { ADMINS_MOCK, CREDENTIALS_MOCK, PATIENTS_MOCK, PROFESSIONALS_MOCK } from '../../mocks';
import { deleteCookie, setCookie } from '../interceptors/cookie.util';
import { simulateNetwork } from '../services/simulate-network.util';

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
}

const MOCK_LATENCY_MS = 500;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly users = signal<User[]>([...PATIENTS_MOCK, ...PROFESSIONALS_MOCK, ...ADMINS_MOCK]);
  private readonly credentials = new Map(CREDENTIALS_MOCK.map((credential) => [credential.email.toLowerCase(), credential.password]));

  private readonly currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly role = computed<UserRole | null>(() => this.currentUserSignal()?.role ?? null);

  login(email: string, password: string): Observable<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.users().find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
    const expectedPassword = this.credentials.get(normalizedEmail);

    if (!user || !expectedPassword || expectedPassword !== password) {
      return throwError(() => new Error('E-mail ou senha inválidos.')).pipe(delay(MOCK_LATENCY_MS));
    }

    return of(user).pipe(
      delay(MOCK_LATENCY_MS),
      tap((loggedInUser) => this.establishSession(loggedInUser)),
    );
  }

  registerPatient(input: PatientRegistration): Observable<Patient> {
    const normalizedEmail = input.email.trim().toLowerCase();

    if (this.users().some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return throwError(() => new Error('Já existe uma conta com este e-mail.')).pipe(delay(MOCK_LATENCY_MS));
    }

    const patient: Patient = {
      id: `pat-${crypto.randomUUID()}`,
      role: 'patient',
      name: input.name,
      email: input.email,
      phone: input.phone,
      cpf:input.cpf,
    };

    this.users.update((users) => [...users, patient]);
    this.credentials.set(normalizedEmail, input.password);

    return of(patient).pipe(
      delay(MOCK_LATENCY_MS),
      tap((registeredPatient) => this.establishSession(registeredPatient)),
    );
  }

  registerProfessional(input: ProfessionalRegistration): Observable<Professional> {
    const normalizedEmail = input.email.trim().toLowerCase();

    if (this.users().some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return throwError(() => new Error('Já existe uma conta com este e-mail.')).pipe(delay(MOCK_LATENCY_MS));
    }

    const professional: Professional = {
      id: `prof-${crypto.randomUUID()}`,
      role: 'professional',
      name: input.name,
      email: input.email,
      phone: input.phone,
      cpf: input.cpf,
      specialtyId: input.specialtyId,
      registrationNumber: input.registrationNumber,
      validationStatus: 'pendente',
      validationDocument: input.document,
    };

    this.users.update((users) => [...users, professional]);
    this.credentials.set(normalizedEmail, input.password);

    return of(professional).pipe(
      delay(MOCK_LATENCY_MS),
      tap((registeredProfessional) => this.establishSession(registeredProfessional)),
    );
  }

  logout(): Observable<void> {
    return of(undefined).pipe(
      delay(200),
      tap(() => {
        this.currentUserSignal.set(null);
        deleteCookie('csrf_token');
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
    setCookie('csrf_token', crypto.randomUUID());
  }
}
