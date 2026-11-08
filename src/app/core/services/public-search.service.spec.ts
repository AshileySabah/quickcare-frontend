import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PublicProfessional, PublicRequest } from '../models';
import { PublicSearchService } from './public-search.service';

describe('PublicSearchService', () => {
  let service: PublicSearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PublicSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('busca profissionais mandando só os filtros preenchidos', () => {
    let result: PublicProfessional[] = [];
    service
      .professionals({ category: 'ENFERMEIRO', city: '  São Paulo ', modality: 'online', minRating: 4 })
      .subscribe((value) => (result = value));

    const request = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/publico/profissionais`);
    expect(request.request.params.get('categoria')).toBe('ENFERMEIRO');
    expect(request.request.params.get('cidade')).toBe('São Paulo');
    expect(request.request.params.get('modalidade')).toBe('ONLINE');
    expect(request.request.params.get('notaMinima')).toBe('4');
    expect(request.request.params.has('uf')).toBeFalse();
    expect(request.request.params.has('especialidadeId')).toBeFalse();
    request.flush([
      {
        id: 20,
        nome: 'Bruno',
        avatarUrl: null,
        atuacoes: [],
        modalidadeAtendimento: 'AMBOS',
        cidade: 'São Paulo',
        uf: 'SP',
        atendimentosConcluidos: 3,
        avaliacoes: { media: 4.5, total: 2, destaques: [] },
      },
    ]);

    expect(result[0].ratings.average).toBe(4.5);
    expect(result[0].completedServices).toBe(3);
  });

  it('mapeia as solicitações abertas sem cidade quando são online', () => {
    let result: PublicRequest[] = [];
    service.requests({}).subscribe((value) => (result = value));

    httpMock.expectOne(`${environment.apiUrl}/publico/solicitacoes`).flush([
      {
        id: 7,
        modalidade: 'ONLINE',
        prazoDesejado: '2026-11-20',
        criadoEm: '2026-11-08T12:00:00Z',
        profissionais: [{ categoriaRotulo: 'Enfermeiro(a)', especialidades: ['Curativos'], quantidade: 2, vagasAbertas: 1 }],
      },
    ]);

    expect(result[0]).toEqual({
      id: '7',
      modality: 'online',
      city: undefined,
      state: undefined,
      desiredDeadline: '2026-11-20',
      createdAt: '2026-11-08T12:00:00Z',
      slots: [{ categoryLabel: 'Enfermeiro(a)', specialties: ['Curativos'], quantity: 2, openSlots: 1 }],
    });
  });

  it('perfil inexistente vira indisponível', () => {
    let result: unknown = 'pendente';
    service.professional('99').subscribe((value) => (result = value));

    httpMock
      .expectOne(`${environment.apiUrl}/publico/profissionais/99`)
      .flush({ message: 'Perfil não encontrado.' }, { status: 404, statusText: 'Not Found' });

    expect(result).toBeUndefined();
  });
});
