import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ValidationService } from './validation.service';

const DETALHE = {
  id: 20,
  perfil: 'PROFISSIONAL',
  statusValidacao: 'APROVADO',
  emRevalidacao: true,
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
    categoria: 'ENFERMEIRO',
    especialidades: ['Curativos'],
    cnpj: null,
    registroProfissional: '123456',
    registroProfissionalUf: 'SP',
  },
  etapas: [],
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

  it('sabe quando o cadastro aprovado está em revalidação', () => {
    const revalidating = service.revalidatingFor('professional');
    httpMock.expectOne(`${environment.apiUrl}/validacao/profissional`).flush(DETALHE);

    expect(revalidating()).toBeTrue();
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
