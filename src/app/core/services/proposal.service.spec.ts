import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Proposal, reacceptNotice } from '../models';
import { ProposalService, resendBase } from './proposal.service';

const PROPOSALS_URL = `${environment.apiUrl}/propostas`;
const REQUEST_PROPOSALS_URL = `${environment.apiUrl}/solicitacoes/50/propostas`;

function apiResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    solicitacao: {
      id: 50,
      pacienteId: 3,
      pacienteNome: 'Paciente Teste',
      profissionais: [
        {
          categoria: 'ENFERMEIRO',
          categoriaRotulo: 'Enfermeiro(a)',
          especialidades: [{ id: 13, nome: 'Curativos', categoria: 'ENFERMEIRO' }],
          quantidade: 2,
          vagasPreenchidas: 0,
        },
      ],
      modalidade: 'PRESENCIAL',
      prazoDesejado: '2026-12-01',
      status: 'RECEBENDO_PROPOSTAS',
    },
    profissional: {
      id: 20,
      nome: 'Profissional Teste',
      categoria: 'ENFERMEIRO',
      categoriaRotulo: 'Enfermeiro(a)',
      especialidades: [{ id: 13, nome: 'Curativos', categoria: 'ENFERMEIRO' }],
    },
    valor: 180.5,
    abordagem: 'Curativos diários com relatório semanal de evolução.',
    prazo: '2026-11-20',
    status: 'PENDENTE',
    criadoEm: '2026-10-01T10:00:00Z',
    atualizadoEm: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

describe('ProposalService', () => {
  let service: ProposalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProposalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envia a proposta para a solicitação e mapeia a resposta', () => {
    let created!: Proposal;

    service
      .submit('50', { price: 180.5, approach: 'Curativos diários com relatório semanal de evolução.', deadline: '2026-11-20' })
      .subscribe((proposal) => (created = proposal));

    const req = httpMock.expectOne(REQUEST_PROPOSALS_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      valor: 180.5,
      abordagem: 'Curativos diários com relatório semanal de evolução.',
      prazo: '2026-11-20',
    });
    req.flush(apiResponse());

    expect(created).toEqual(
      jasmine.objectContaining({
        id: '100',
        requestId: '50',
        professionalId: '20',
        price: 180.5,
        status: 'pendente',
      }),
    );
    expect(created.professional.name).toBe('Profissional Teste');
    expect(created.request.patientName).toBe('Paciente Teste');
    expect(created.request.status).toBe('recebendo_propostas');
    expect(created.request.professionals[0].specialties[0].name).toBe('Curativos');
  });

  it('lista as propostas de uma solicitação', () => {
    let proposals: Proposal[] = [];
    service.listForRequest('50').subscribe((result) => (proposals = result));

    httpMock.expectOne(REQUEST_PROPOSALS_URL).flush([apiResponse(), apiResponse({ id: 101, status: 'ACEITA' })]);

    expect(proposals.map((proposal) => proposal.status)).toEqual(['pendente', 'aceita']);
  });

  it('lista as propostas do profissional logado', () => {
    service.listMine().subscribe();
    const req = httpMock.expectOne(PROPOSALS_URL);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('edita via PUT', () => {
    service.update('100', { price: 200, approach: 'Abordagem revisada para o teste.', deadline: '2026-11-25' }).subscribe();

    const req = httpMock.expectOne(`${PROPOSALS_URL}/100`);
    expect(req.request.method).toBe('PUT');
    req.flush(apiResponse({ valor: 200 }));
  });

  it('cancela via PATCH /cancelar', () => {
    let cancelled!: Proposal;
    service.cancel('100').subscribe((proposal) => (cancelled = proposal));

    const req = httpMock.expectOne(`${PROPOSALS_URL}/100/cancelar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(apiResponse({ status: 'CANCELADA' }));

    expect(cancelled.status).toBe('cancelada');
    expect(service.canEdit(cancelled)).toBe(false);
    expect(service.canCancel(cancelled)).toBe(false);
  });

  it('aceita via PATCH /aceitar', () => {
    service.accept('100').subscribe();

    const req = httpMock.expectOne(`${PROPOSALS_URL}/100/aceitar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(apiResponse({ status: 'ACEITA' }));
  });

  it('getById devolve undefined quando a API responde 404', () => {
    let result: Proposal | undefined | null = null;
    service.getById('999').subscribe((proposal) => (result = proposal));

    httpMock.expectOne(`${PROPOSALS_URL}/999`).flush({ message: 'Proposta não encontrada.' }, { status: 404, statusText: 'Not Found' });

    expect(result).toBeUndefined();
  });

  it('propaga a mensagem de erro da API', () => {
    let error: Error | undefined;
    service
      .submit('50', { price: 100, approach: 'Abordagem qualquer para o teste.', deadline: '2026-11-20' })
      .subscribe({ error: (err: Error) => (error = err) });

    httpMock.expectOne(REQUEST_PROPOSALS_URL).flush(
      { message: 'Você já enviou uma proposta para esta solicitação. Edite ou cancele a existente.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(error?.message).toBe('Você já enviou uma proposta para esta solicitação. Edite ou cancele a existente.');
  });

  it('edita e cancela proposta pendente ou aceita enquanto a solicitação está em curso', () => {
    const base = { status: 'aceita', request: { status: 'em_andamento' } } as Proposal;

    expect(service.canEdit(base)).toBeTrue();
    expect(service.canCancel({ ...base, status: 'pendente' })).toBeTrue();
    expect(service.canEdit({ ...base, status: 'recusada' })).toBeFalse();
    expect(service.canEdit({ ...base, request: { ...base.request, status: 'concluida' } })).toBeFalse();
  });

  it('oferece nova proposta só na última recusada ou cancelada, sem outra ativa e com a solicitação recebendo', () => {
    const closed = (id: string, status: Proposal['status'], createdAt: string, requestStatus = 'recebendo_propostas') =>
      ({ id, requestId: '50', status, createdAt, request: { status: requestStatus } }) as Proposal;
    const older = closed('1', 'cancelada', '2026-10-01');
    const latest = closed('2', 'recusada', '2026-10-05');

    expect(service.canResend(latest, [older, latest])).toBeTrue();
    expect(service.canResend(older, [older, latest])).toBeFalse();
    expect(service.canResend(latest, [older, latest, { ...closed('3', 'pendente', '2026-10-06') }])).toBeFalse();
    expect(service.canResend(closed('4', 'recusada', '2026-10-05', 'em_andamento'), [])).toBeFalse();
    expect(resendBase([older, latest])?.id).toBe('2');
  });

  it('mapeia o motivo de a proposta aguardar novo aceite', () => {
    let proposal: Proposal | undefined;
    service.getById('100').subscribe((result) => (proposal = result));

    httpMock.expectOne(`${PROPOSALS_URL}/100`).flush(apiResponse({ motivoReaceite: 'PROPOSTA_ALTERADA' }));

    expect(proposal?.reacceptReason).toBe('proposta_alterada');
    expect(reacceptNotice(proposal!, 'patient')).toContain('Aceite de novo');
  });
});
