import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PendingRatings } from '../models';
import { RatingService } from './rating.service';

const RESPOSTA = {
  pendentes: [
    {
      atendimentoId: 900,
      solicitacaoId: 50,
      servico: 'Curativos',
      nomeAvaliado: null,
      inicio: '2026-11-07T08:00:00Z',
      termino: '2026-11-07T18:00:00Z',
      prazo: '2026-12-07T18:00:00Z',
    },
  ],
  destaques: [{ codigo: 'PONTUALIDADE', rotulo: 'Pontualidade', positivo: true }],
};

describe('RatingService', () => {
  let service: RatingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RatingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('busca as pendentes do perfil e mapeia sem o nome quando ele vem escondido', () => {
    let result: PendingRatings | undefined;
    service.pending('professional').subscribe((value) => (result = value));

    const request = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/avaliacoes/pendentes`);
    expect(request.request.params.get('perfil')).toBe('PROFISSIONAL');
    request.flush(RESPOSTA);

    expect(result?.pending[0]).toEqual({
      attendanceId: '900',
      requestId: '50',
      service: 'Curativos',
      ratedName: undefined,
      start: '2026-11-07T08:00:00Z',
      end: '2026-11-07T18:00:00Z',
      deadline: '2026-12-07T18:00:00Z',
    });
    expect(result?.highlights).toEqual([{ code: 'PONTUALIDADE', label: 'Pontualidade', positive: true }]);
  });

  it('envia a nota e os destaques do atendimento', () => {
    service.rate('900', { score: 4, highlights: ['PONTUALIDADE'] }).subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/avaliacoes/atendimentos/900`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nota: 4, destaques: ['PONTUALIDADE'] });
    request.flush({ pendentes: [], destaques: [] });
  });

  it('pergunta uma vez só por perfil na sessão', () => {
    expect(service.shouldPrompt('patient')).toBeTrue();
    service.dismissPrompt('patient');
    expect(service.shouldPrompt('patient')).toBeFalse();
    expect(service.shouldPrompt('professional')).toBeTrue();
  });
});
