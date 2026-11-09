import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ValidationDetail } from '../models';
import { ValidationService } from './validation.service';

const ENFERMEIRO = {
  id: 200,
  categoria: 'ENFERMEIRO',
  categoriaRotulo: 'Enfermeiro(a)',
  rotulo: 'Enfermeiro(a)',
  siglaRegistro: 'COREN',
  especialidades: [{ id: 5, nome: 'Curativos', categoria: 'ENFERMEIRO' }],
  registroProfissional: '123456',
  registroProfissionalUf: 'SP',
};

const DETALHE = {
  id: 20,
  perfil: 'PROFISSIONAL',
  statusValidacao: 'APROVADO',
  emRevalidacao: true,
  bloqueiaCriacao: true,
  cadastradoEm: '2026-10-01T10:00:00Z',
  dados: {
    nome: 'Joana',
    email: 'joana@quickcare.dev',
    telefone: null,
    avatarUrl: null,
    cpf: '52998224725',
    dataNascimento: '1990-01-01',
    genero: 'FEMININO',
    documentoIdentidadeTipo: 'CNH',
    documentoIdentidadeNumero: '02650306461',
    documentoIdentidadeUf: null,
    cep: '01311000',
    logradouro: 'Rua Augusta',
    numero: '1000',
    complemento: null,
    bairro: 'Consolação',
    cidade: 'São Paulo',
    uf: 'SP',
    atuacoes: [ENFERMEIRO],
    cnpj: null,
  },
  etapas: [
    {
      id: 7,
      tipo: 'REGISTRO_PROFISSIONAL',
      descricao: 'Registro profissional — Enfermeiro(a)',
      atuacao: ENFERMEIRO,
      status: 'PENDENTE',
      justificativa: null,
      documento: null,
      anexo: null,
      avaliadoPor: null,
      avaliadoEm: null,
      criadoEm: '2026-11-01T10:00:00Z',
      historico: [],
    },
  ],
};

describe('ValidationService', () => {
  let service: ValidationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ValidationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('trava a criação só quando os dados da conta estão em revalidação', () => {
    const locked = service.revalidatingFor('professional');
    httpMock.expectOne(`${environment.apiUrl}/validacao/profissional`).flush(DETALHE);

    expect(locked()).toBeTrue();
  });

  it('registro de atuação em análise não trava a criação', () => {
    const locked = service.revalidatingFor('professional');
    httpMock
      .expectOne(`${environment.apiUrl}/validacao/profissional`)
      .flush({ ...DETALHE, bloqueiaCriacao: false });

    expect(locked()).toBeFalse();
  });

  it('cada etapa de registro carrega a sua atuação e uma chave própria', () => {
    let detail!: ValidationDetail;
    service.getMine('professional').subscribe((result) => (detail = result));
    httpMock.expectOne(`${environment.apiUrl}/validacao/profissional`).flush(DETALHE);

    const step = detail.steps[0];
    expect(step.key).toBe('REGISTRO_PROFISSIONAL:200');
    expect(step.practiceArea?.registrationLabel).toBe('COREN');
    expect(step.practiceArea?.specialties.map((specialty) => specialty.name)).toEqual(['Curativos']);
    expect(detail.data.practiceAreas.map((area) => area.label)).toEqual(['Enfermeiro(a)']);
    expect(detail.creationLocked).toBeTrue();
  });

  it('reenvia o registro informando a atuação', () => {
    service
      .resubmit('professional', 'REGISTRO_PROFISSIONAL', { registrationNumber: '654321', registrationUf: 'RJ' }, '200')
      .subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === `${environment.apiUrl}/validacao/profissional/etapas/REGISTRO_PROFISSIONAL/reenvio`,
    );
    expect(req.request.params.get('atuacao')).toBe('200');
    req.flush(DETALHE);
  });

  it('envia data de nascimento e gênero, e o documento só quando há um novo', async () => {
    service
      .resubmit('professional', 'IDENTIDADE', {
        cpf: '52998224725',
        identityDocumentType: 'CNH',
        identityDocumentNumber: '02650306461',
        birthDate: '1990-01-02',
        gender: 'FEMININO',
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/validacao/profissional/etapas/IDENTIDADE/reenvio`);
    const body = req.request.body as FormData;
    const dados = JSON.parse(await (body.get('dados') as Blob).text());
    expect(dados.dataNascimento).toBe('1990-01-02');
    expect(dados.genero).toBe('FEMININO');
    expect(body.has('documento')).toBeFalse();
    req.flush(DETALHE);
  });

  it('filtra a lista do admin pelos que estão em revalidação', () => {
    service.list('patient', 'revalidacao').subscribe();

    const req = httpMock.expectOne((request) => request.url === `${environment.apiUrl}/admin/validacoes/pacientes`);
    expect(req.request.params.get('emRevalidacao')).toBe('true');
    req.flush([]);
  });
});
