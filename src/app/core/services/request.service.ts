import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestAddress, RequestStatus, ServiceModality, ServiceRequest } from '../models';
import { SERVICE_REQUESTS_MOCK } from '../../mocks';
import { simulateNetwork } from './simulate-network.util';

export interface CreateRequestInput {
  patientId: string;
  specialtyId: string;
  description: string;
  modality: ServiceModality;
  address?: RequestAddress;
  desiredDeadline: string;
}

export interface UpdateRequestInput {
  specialtyId?: string;
  description?: string;
  modality?: ServiceModality;
  address?: RequestAddress;
  desiredDeadline?: string;
}

const EDITABLE_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas'];
const CANCELABLE_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas', 'em_andamento'];
const RECEIVING_PROPOSALS_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas'];

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly requestsSignal = signal<ServiceRequest[]>([...SERVICE_REQUESTS_MOCK]);
  readonly requests = this.requestsSignal.asReadonly();

  canEdit(request: ServiceRequest): boolean {
    return EDITABLE_STATUSES.includes(request.status);
  }

  canCancel(request: ServiceRequest): boolean {
    return CANCELABLE_STATUSES.includes(request.status);
  }

  canReceiveProposals(request: ServiceRequest): boolean {
    return RECEIVING_PROPOSALS_STATUSES.includes(request.status);
  }

  list(filter?: { patientId?: string }, simulateError = false): Observable<ServiceRequest[]> {
    return simulateNetwork(
      () => {
        const all = this.requestsSignal();
        return filter?.patientId ? all.filter((request) => request.patientId === filter.patientId) : all;
      },
      { simulateError, errorMessage: 'Não foi possível carregar as solicitações.' },
    );
  }

  listOpenForSpecialty(specialtyId: string, simulateError = false): Observable<ServiceRequest[]> {
    return simulateNetwork(
      () =>
        this.requestsSignal().filter(
          (request) => request.specialtyId === specialtyId && this.canReceiveProposals(request),
        ),
      { simulateError, errorMessage: 'Não foi possível carregar as solicitações disponíveis.' },
    );
  }

  getById(id: string, simulateError = false): Observable<ServiceRequest | undefined> {
    return simulateNetwork(() => this.requestsSignal().find((request) => request.id === id), {
      simulateError,
      errorMessage: 'Não foi possível carregar a solicitação.',
    });
  }

  create(input: CreateRequestInput): Observable<ServiceRequest> {
    return simulateNetwork(() => {
      const now = new Date().toISOString();
      const request: ServiceRequest = {
        id: `req-${crypto.randomUUID()}`,
        patientId: input.patientId,
        specialtyId: input.specialtyId,
        description: input.description,
        modality: input.modality,
        address: input.address,
        desiredDeadline: input.desiredDeadline,
        status: 'aberta',
        createdAt: now,
        updatedAt: now,
      };

      this.requestsSignal.update((requests) => [...requests, request]);

      return request;
    });
  }

  update(id: string, patch: UpdateRequestInput): Observable<ServiceRequest> {
    return simulateNetwork(() => {
      const request = this.requestsSignal().find((item) => item.id === id);

      if (!request) {
        throw new Error('Solicitação não encontrada.');
      }

      if (!this.canEdit(request)) {
        throw new Error('Esta solicitação não pode mais ser editada.');
      }

      const updated: ServiceRequest = { ...request, ...patch, updatedAt: new Date().toISOString() };
      this.requestsSignal.update((requests) => requests.map((item) => (item.id === id ? updated : item)));

      return updated;
    });
  }

  cancel(id: string): Observable<ServiceRequest> {
    return simulateNetwork(() => {
      const request = this.requestsSignal().find((item) => item.id === id);

      if (!request) {
        throw new Error('Solicitação não encontrada.');
      }

      if (!this.canCancel(request)) {
        throw new Error('Esta solicitação não pode mais ser cancelada.');
      }

      const updated: ServiceRequest = { ...request, status: 'cancelada', updatedAt: new Date().toISOString() };
      this.requestsSignal.update((requests) => requests.map((item) => (item.id === id ? updated : item)));

      return updated;
    });
  }

  complete(id: string): Observable<ServiceRequest> {
    return simulateNetwork(() => {
      const request = this.requestsSignal().find((item) => item.id === id);

      if (!request) {
        throw new Error('Solicitação não encontrada.');
      }

      if (request.status !== 'em_andamento') {
        throw new Error('Apenas solicitações em andamento podem ser concluídas.');
      }

      const updated: ServiceRequest = { ...request, status: 'concluida', updatedAt: new Date().toISOString() };
      this.requestsSignal.update((requests) => requests.map((item) => (item.id === id ? updated : item)));

      return updated;
    });
  }

  markReceivingProposals(id: string): void {
    this.requestsSignal.update((requests) =>
      requests.map((request) =>
        request.id === id && request.status === 'aberta'
          ? { ...request, status: 'recebendo_propostas', updatedAt: new Date().toISOString() }
          : request,
      ),
    );
  }

  markInProgress(id: string, acceptedProposalId: string): void {
    this.requestsSignal.update((requests) =>
      requests.map((request) =>
        request.id === id
          ? { ...request, status: 'em_andamento', acceptedProposalId, updatedAt: new Date().toISOString() }
          : request,
      ),
    );
  }
}
