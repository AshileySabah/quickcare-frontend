import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MyPracticeArea, PracticeAreaImpact } from '../models';
import { PracticeAreaService } from './practice-area.service';

const BASE_URL = `${environment.apiUrl}/perfil/profissional/atuacoes`;

const MEDICO = {
  atuacao: {
    id: 201,
    categoria: 'MEDICO',
    categoriaRotulo: 'Médico(a)',
    rotulo: 'Médico(a)',
    siglaRegistro: 'CRM',
    especialidades: [{ id: 9, nome: 'Clínica Médica', categoria: 'MEDICO' }],
    registroProfissional: '98765',
    registroProfissionalUf: 'SP',
  },
  statusRegistro: 'PENDENTE',
  liberada: false,
};

describe('PracticeAreaService', () => {
  let service: PracticeAreaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PracticeAreaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista as atuações com o status do registro', () => {
    let areas: MyPracticeArea[] = [];
    service.list().subscribe((result) => (areas = result));
    httpMock.expectOne(BASE_URL).flush([MEDICO]);

    expect(areas[0].area.label).toBe('Médico(a)');
    expect(areas[0].registrationStatus).toBe('pendente');
    expect(areas[0].released).toBeFalse();
  });

  it('inclui a atuação com o documento do registro', async () => {
    const crm = new File(['x'], 'crm.pdf', { type: 'application/pdf' });
    service
      .include({ category: 'MEDICO', specialtyIds: ['9'], registrationNumber: ' 98765 ', registrationUf: 'SP', document: crm })
      .subscribe();

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    const dados = JSON.parse(await (body.get('dados') as Blob).text());
    expect(dados).toEqual({
      categoria: 'MEDICO',
      especialidadeIds: [9],
      registroProfissional: '98765',
      registroProfissionalUf: 'SP',
    });
    expect((body.get('documento') as File).name).toBe('crm.pdf');
    req.flush([MEDICO]);
  });

  it('pede a prévia da remoção sem especialidades e da troca com elas', () => {
    let impact!: PracticeAreaImpact;
    service.impact('201').subscribe((result) => (impact = result));
    const remocao = httpMock.expectOne((request) => request.url === `${BASE_URL}/201/impacto`);
    expect(remocao.request.params.has('especialidadeIds')).toBeFalse();
    remocao.flush({
      permitido: true,
      impedimento: null,
      propostas: [
        {
          propostaId: 100,
          solicitacaoId: 50,
          servico: 'Médico(a) — Clínica Médica',
          status: 'ACEITA',
          inicio: '2026-11-20T11:00:00Z',
          termino: '2026-11-20T19:00:00Z',
          geraOcorrencia: true,
        },
      ],
    });

    expect(impact.proposals[0].status).toBe('aceita');
    expect(impact.proposals[0].createsOccurrence).toBeTrue();

    service.impact('201', ['9', '10']).subscribe();
    const troca = httpMock.expectOne((request) => request.url === `${BASE_URL}/201/impacto`);
    expect(troca.request.params.get('especialidadeIds')).toBe('9,10');
    troca.flush({ permitido: true, impedimento: null, propostas: [] });
  });

  it('remove e salva especialidades pelos endpoints próprios', () => {
    service.remove('201').subscribe();
    const remover = httpMock.expectOne(`${BASE_URL}/201`);
    expect(remover.request.method).toBe('DELETE');
    remover.flush([]);

    service.updateSpecialties('201', ['9']).subscribe();
    const salvar = httpMock.expectOne(`${BASE_URL}/201/especialidades`);
    expect(salvar.request.method).toBe('PUT');
    expect(salvar.request.body).toEqual({ especialidadeIds: [9] });
    salvar.flush([MEDICO]);
  });
});
