import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../auth/auth-api.model';
import { Address, ProfessionalCategory, RequestStatus, ServiceModality, ServiceRequest } from '../models';

export interface CreateRequestInput {
  professionals: { category: ProfessionalCategory; specialtyIds: string[]; quantity: number }[];
  description: string;
  modality: ServiceModality;
  address?: Address;
  desiredDeadline: string;
}

export type UpdateRequestInput = CreateRequestInput;

type ModalidadeApi = 'PRESENCIAL' | 'ONLINE';
type StatusApi = 'ABERTA' | 'RECEBENDO_PROPOSTAS' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

interface EnderecoApi {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

interface SolicitacaoApiResponse {
  id: number;
  pacienteId: number;
  profissionais: {
    categoria: ProfessionalCategory;
    categoriaRotulo: string;
    especialidades: { id: number; nome: string; categoria: ProfessionalCategory }[];
    quantidade: number;
  }[];
  descricao: string;
  modalidade: ModalidadeApi;
  endereco: EnderecoApi | null;
  prazoDesejado: string;
  status: StatusApi;
  criadoEm: string;
  atualizadoEm: string;
}

const EDITABLE_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas'];
const CANCELABLE_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas', 'em_andamento'];
const RECEIVING_PROPOSALS_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas'];

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/solicitacoes`;

  /**
   * Cache local das solicitações já carregadas. Enquanto o back-end de propostas
   * não existe, o ProposalService (mock) move o status das solicitações por aqui.
   */
  private readonly requestsSignal = signal<ServiceRequest[]>([]);
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

  /** Solicitações do paciente logado. */
  list(): Observable<ServiceRequest[]> {
    return this.http.get<SolicitacaoApiResponse[]>(this.baseUrl).pipe(
      map((response) => response.map(toServiceRequest)),
      tap((requests) => requests.forEach((request) => this.cache(request))),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar as solicitações.'))),
    );
  }

  /** Solicitações que ainda recebem propostas nas especialidades do profissional logado. */
  listAvailable(): Observable<ServiceRequest[]> {
    return this.http.get<SolicitacaoApiResponse[]>(`${this.baseUrl}/disponiveis`).pipe(
      map((response) => response.map(toServiceRequest)),
      tap((requests) => requests.forEach((request) => this.cache(request))),
      catchError((error: unknown) =>
        throwError(() => normalizeError(error, 'Não foi possível carregar as solicitações disponíveis.')),
      ),
    );
  }

  getById(id: string): Observable<ServiceRequest | undefined> {
    return this.http.get<SolicitacaoApiResponse>(`${this.baseUrl}/${id}`).pipe(
      map(toServiceRequest),
      tap((request) => this.cache(request)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(undefined);
        }
        return throwError(() => normalizeError(error, 'Não foi possível carregar a solicitação.'));
      }),
    );
  }

  create(input: CreateRequestInput): Observable<ServiceRequest> {
    return this.http.post<SolicitacaoApiResponse>(this.baseUrl, toApiPayload(input)).pipe(
      map(toServiceRequest),
      tap((request) => this.cache(request)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível criar a solicitação.'))),
    );
  }

  update(id: string, input: UpdateRequestInput): Observable<ServiceRequest> {
    return this.http.put<SolicitacaoApiResponse>(`${this.baseUrl}/${id}`, toApiPayload(input)).pipe(
      map(toServiceRequest),
      tap((request) => this.cache(request)),
      catchError((error: unknown) =>
        throwError(() => normalizeError(error, 'Não foi possível atualizar a solicitação.')),
      ),
    );
  }

  cancel(id: string): Observable<ServiceRequest> {
    return this.http.patch<SolicitacaoApiResponse>(`${this.baseUrl}/${id}/cancelar`, {}).pipe(
      map(toServiceRequest),
      tap((request) => this.cache(request)),
      catchError((error: unknown) =>
        throwError(() => normalizeError(error, 'Não foi possível cancelar a solicitação.')),
      ),
    );
  }

  complete(id: string): Observable<ServiceRequest> {
    return this.http.patch<SolicitacaoApiResponse>(`${this.baseUrl}/${id}/concluir`, {}).pipe(
      map(toServiceRequest),
      tap((request) => this.cache(request)),
      catchError((error: unknown) =>
        throwError(() => normalizeError(error, 'Não foi possível concluir a solicitação.')),
      ),
    );
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

  private cache(request: ServiceRequest): void {
    this.requestsSignal.update((requests) =>
      requests.some((item) => item.id === request.id)
        ? requests.map((item) => (item.id === request.id ? request : item))
        : [...requests, request],
    );
  }
}

function toServiceRequest(response: SolicitacaoApiResponse): ServiceRequest {
  return {
    id: String(response.id),
    patientId: String(response.pacienteId),
    professionals: response.profissionais.map((profissional) => ({
      category: profissional.categoria,
      categoryLabel: profissional.categoriaRotulo,
      specialties: profissional.especialidades.map((especialidade) => ({
        id: String(especialidade.id),
        name: especialidade.nome,
        category: especialidade.categoria,
      })),
      quantity: profissional.quantidade,
    })),
    description: response.descricao,
    modality: response.modalidade === 'PRESENCIAL' ? 'presencial' : 'online',
    address: response.endereco
      ? {
          cep: response.endereco.cep,
          street: response.endereco.logradouro,
          number: response.endereco.numero,
          complement: response.endereco.complemento ?? undefined,
          neighborhood: response.endereco.bairro,
          city: response.endereco.cidade,
          state: response.endereco.uf,
        }
      : undefined,
    desiredDeadline: response.prazoDesejado,
    status: response.status.toLowerCase() as RequestStatus,
    createdAt: response.criadoEm,
    updatedAt: response.atualizadoEm,
  };
}

function toApiPayload(input: CreateRequestInput) {
  const address = input.modality === 'presencial' ? input.address : undefined;

  return {
    profissionais: input.professionals.map((professional) => ({
      categoria: professional.category,
      especialidadeIds: professional.specialtyIds.map(Number),
      quantidade: professional.quantity,
    })),
    descricao: input.description,
    modalidade: input.modality === 'presencial' ? 'PRESENCIAL' : 'ONLINE',
    endereco: address
      ? {
          cep: address.cep,
          logradouro: address.street,
          numero: address.number,
          complemento: address.complement || null,
          bairro: address.neighborhood,
          cidade: address.city,
          uf: address.state,
        }
      : null,
    prazoDesejado: input.desiredDeadline,
  };
}

function normalizeError(error: unknown, defaultMessage: string): Error {
  if (error instanceof HttpErrorResponse) {
    const apiError = error.error as ApiErrorResponse | undefined;
    return new Error(apiError?.message ?? defaultMessage);
  }

  return error instanceof Error ? error : new Error(defaultMessage);
}
