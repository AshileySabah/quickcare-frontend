import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import {
  Address,
  ProfessionalCategory,
  RequestStatus,
  RequestedProfessional,
  ServiceModality,
  ServiceRequest,
} from '../models';

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

export interface ProfissionalSolicitadoApi {
  categoria: ProfessionalCategory;
  categoriaRotulo: string;
  especialidades: { id: number; nome: string; categoria: ProfessionalCategory }[];
  quantidade: number;
  vagasPreenchidas: number;
}

interface SolicitacaoApiResponse {
  id: number;
  pacienteId: number;
  profissionais: ProfissionalSolicitadoApi[];
  descricao: string;
  modalidade: ModalidadeApi;
  endereco: EnderecoApi | null;
  prazoDesejado: string;
  status: StatusApi;
  criadoEm: string;
  atualizadoEm: string;
  totalPropostas: number;
  atendimentoEmAndamento: boolean;
  proximoAtendimentoInicio?: string;
}

/** Com aceitos também: eles reaceitam ou recusam a nova versão. */
const EDITABLE_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas', 'em_andamento'];
const CANCELABLE_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas', 'em_andamento'];
const RECEIVING_PROPOSALS_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas'];

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/solicitacoes`;

  /** Cache local das solicitações já carregadas. */
  private readonly requestsSignal = signal<ServiceRequest[]>([]);
  readonly requests = this.requestsSignal.asReadonly();

  /** Em curso e sem atendimento acontecendo agora (nesse caso, remarca ou cancela o atendimento). */
  canEdit(request: ServiceRequest): boolean {
    return EDITABLE_STATUSES.includes(request.status) && !request.attendanceInProgress;
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
    professionals: response.profissionais.map(toRequestedProfessional),
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
    proposalCount: response.totalPropostas,
    attendanceInProgress: response.atendimentoEmAndamento,
    nextAttendanceStart: response.proximoAtendimentoInicio,
    createdAt: response.criadoEm,
    updatedAt: response.atualizadoEm,
  };
}

export function toRequestedProfessional(profissional: ProfissionalSolicitadoApi): RequestedProfessional {
  return {
    category: profissional.categoria,
    categoryLabel: profissional.categoriaRotulo,
    specialties: profissional.especialidades.map((especialidade) => ({
      id: String(especialidade.id),
      name: especialidade.nome,
      category: especialidade.categoria,
    })),
    quantity: profissional.quantidade,
    filled: profissional.vagasPreenchidas,
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

/** O que acontece ao cancelar uma solicitação com propostas aceitas (sem aceitas, cancela sem perguntar). */
export const CANCEL_REQUEST_CONSEQUENCES = [
  'Os atendimentos marcados são cancelados e os profissionais são avisados.',
  'As propostas pendentes serão recusadas e ninguém mais poderá enviar propostas.',
  'Essa ação não pode ser desfeita.',
];

/** O que acontece ao editar uma solicitação que já tem propostas aceitas. */
export const EDIT_REQUEST_WITH_ACCEPTED_CONSEQUENCES = [
  'Os profissionais aceitos precisam reaceitar a nova versão; eles podem recusar sem penalidade.',
  'Enquanto eles não respondem, a solicitação volta a receber propostas e você pode aceitar outra para a vaga.',
  'Se faltar menos de 48h para o atendimento, trocar ou perder o profissional conta como ocorrência para você.',
];

const LATE_CHANGE_MS = 48 * 60 * 60 * 1000;

/** O próximo atendimento começa em menos de 48h: editar agora pode contar ocorrência. */
export function isLateChange(request: ServiceRequest, now: Date = new Date()): boolean {
  return (
    !!request.nextAttendanceStart && new Date(request.nextAttendanceStart).getTime() - now.getTime() < LATE_CHANGE_MS
  );
}

/** Alguma vaga já tem proposta aceita: editar faz os aceitos voltarem a aguardar. */
export function hasAcceptedProposals(request: ServiceRequest): boolean {
  return request.professionals.some((professional) => professional.filled > 0);
}
