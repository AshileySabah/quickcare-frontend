import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ServiceRequest } from '../models';
import { RequestService } from './request.service';

const BASE_URL = `${environment.apiUrl}/solicitacoes`;

function apiResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    pacienteId: 3,
    especialidadeId: 4,
    especialidadeNome: 'Nutrição',
    descricao: 'Preciso de acompanhamento nutricional detalhado para o teste automatizado.',
    modalidade: 'ONLINE',
    endereco: null,
    prazoDesejado: '2026-12-01',
    status: 'ABERTA',
    criadoEm: '2026-09-01T10:00:00Z',
    atualizadoEm: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

describe('RequestService', () => {
  let service: RequestService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RequestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('cria enviando o payload da API e mapeia a resposta', () => {
    let created!: ServiceRequest;

    service
      .create({
        specialtyId: '4',
        description: 'Preciso de atendimento presencial para o teste automatizado.',
        modality: 'presencial',
        address: { street: 'Rua A, 10', city: 'São Paulo', state: 'SP' },
        desiredDeadline: '2026-12-01',
      })
      .subscribe((request) => (created = request));

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      especialidadeId: 4,
      descricao: 'Preciso de atendimento presencial para o teste automatizado.',
      modalidade: 'PRESENCIAL',
      endereco: { logradouro: 'Rua A, 10', cidade: 'São Paulo', uf: 'SP' },
      prazoDesejado: '2026-12-01',
    });

    req.flush(
      apiResponse({ modalidade: 'PRESENCIAL', endereco: { logradouro: 'Rua A, 10', cidade: 'São Paulo', uf: 'SP' } }),
    );

    expect(created).toEqual(
      jasmine.objectContaining({
        id: '10',
        specialtyId: '4',
        modality: 'presencial',
        address: { street: 'Rua A, 10', city: 'São Paulo', state: 'SP' },
        status: 'aberta',
      }),
    );
    expect(service.requests().map((request) => request.id)).toContain('10');
  });

  it('não envia endereço para solicitações online', () => {
    service
      .create({
        specialtyId: '4',
        description: 'Preciso de acompanhamento nutricional detalhado online.',
        modality: 'online',
        address: { street: 'ignorado', city: 'ignorado', state: 'SP' },
        desiredDeadline: '2026-12-01',
      })
      .subscribe();

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.body.endereco).toBeNull();
    req.flush(apiResponse());
  });

  it('mapeia status em snake_case', () => {
    let requests: ServiceRequest[] = [];
    service.list().subscribe((result) => (requests = result));

    httpMock.expectOne(BASE_URL).flush([apiResponse({ status: 'RECEBENDO_PROPOSTAS' })]);

    expect(requests[0].status).toBe('recebendo_propostas');
  });

  it('getById devolve undefined quando a API responde 404', () => {
    let result: ServiceRequest | undefined | null = null;
    service.getById('99').subscribe((request) => (result = request));

    httpMock
      .expectOne(`${BASE_URL}/99`)
      .flush({ message: 'Solicitação não encontrada.' }, { status: 404, statusText: 'Not Found' });

    expect(result).toBeUndefined();
  });

  it('propaga a mensagem de erro da API', () => {
    let error: Error | undefined;
    service
      .update('10', {
        specialtyId: '4',
        description: 'Descrição atualizada para o teste automatizado.',
        modality: 'online',
        desiredDeadline: '2026-12-01',
      })
      .subscribe({ error: (err: Error) => (error = err) });

    const req = httpMock.expectOne(`${BASE_URL}/10`);
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'Esta solicitação não pode mais ser editada.' }, { status: 409, statusText: 'Conflict' });

    expect(error?.message).toBe('Esta solicitação não pode mais ser editada.');
  });

  it('cancela via PATCH /cancelar', () => {
    let cancelled!: ServiceRequest;
    service.cancel('10').subscribe((request) => (cancelled = request));

    const req = httpMock.expectOne(`${BASE_URL}/10/cancelar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(apiResponse({ status: 'CANCELADA' }));

    expect(cancelled.status).toBe('cancelada');
  });

  it('listAvailable consulta /disponiveis', () => {
    let requests: ServiceRequest[] | undefined;
    service.listAvailable().subscribe((result) => (requests = result));
    httpMock.expectOne(`${BASE_URL}/disponiveis`).flush([]);

    expect(requests).toEqual([]);
  });

  it('permite editar apenas enquanto aberta ou recebendo propostas', () => {
    const base = { status: 'aberta' } as ServiceRequest;

    expect(service.canEdit(base)).toBe(true);
    expect(service.canEdit({ ...base, status: 'recebendo_propostas' })).toBe(true);
    expect(service.canEdit({ ...base, status: 'em_andamento' })).toBe(false);
    expect(service.canCancel({ ...base, status: 'em_andamento' })).toBe(true);
    expect(service.canCancel({ ...base, status: 'concluida' })).toBe(false);
  });

  it('markReceivingProposals só transiciona a partir de "aberta"', () => {
    service.list().subscribe();
    httpMock.expectOne(BASE_URL).flush([apiResponse(), apiResponse({ id: 11, status: 'CANCELADA' })]);

    service.markReceivingProposals('10');
    service.markReceivingProposals('11');

    const byId = new Map(service.requests().map((request) => [request.id, request]));
    expect(byId.get('10')?.status).toBe('recebendo_propostas');
    expect(byId.get('11')?.status).toBe('cancelada');
  });
});
