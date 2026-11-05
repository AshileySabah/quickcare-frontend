import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PatientProfile, ProfessionalProfile, ProfileService } from './profile.service';

const BASE = {
  nome: 'Paciente Teste',
  email: 'paciente@quickcare.dev',
  telefone: '11987654321',
  avatarUrl: null,
  dataNascimento: '1980-01-01',
  genero: 'FEMININO',
  contatosEmergencia: [],
  cep: '01311200',
  logradouro: 'Rua Haddock Lobo',
  numero: '300',
  complemento: null,
  bairro: 'Cerqueira César',
  cidade: 'São Paulo',
  uf: 'SP',
  declaracoes: { confirmacaoInformacoesVerdadeiras: true, consentimentoLgpd: true },
};

const PATIENT = { ...BASE, alergias: null, condicoesSaude: null, medicamentosEmUso: null };

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('traz as declarações do cadastro no perfil do paciente', () => {
    let profile!: PatientProfile;
    service.getPatientProfile().subscribe((result) => (profile = result));

    httpMock.expectOne(`${environment.apiUrl}/perfil/paciente`).flush(PATIENT);

    expect(profile.declarations).toEqual({ infoConfirmedTrue: true, lgpdConsent: true });
  });

  it('não envia data de nascimento nem gênero ao salvar o perfil', async () => {
    service
      .updatePatientProfile({
        name: 'Paciente Teste',
        phone: '11987654321',
        emergencyContacts: [],
        address: {
          cep: '01311200',
          street: 'Rua Haddock Lobo',
          number: '300',
          complement: '',
          neighborhood: 'Cerqueira César',
          city: 'São Paulo',
          state: 'SP',
        },
        removeAvatar: false,
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/perfil/paciente`);
    const dados = JSON.parse(await ((req.request.body as FormData).get('dados') as Blob).text());
    expect(dados.nome).toBe('Paciente Teste');
    expect('dataNascimento' in dados).toBeFalse();
    expect('genero' in dados).toBeFalse();
    req.flush({ mensagem: 'Dados atualizados.', perfil: PATIENT });
  });

  it('traz categoria, especialidades e registro no perfil do profissional', () => {
    let profile!: ProfessionalProfile;
    service.getProfessionalProfile().subscribe((result) => (profile = result));

    httpMock.expectOne(`${environment.apiUrl}/perfil/profissional`).flush({
      ...BASE,
      possuiSeguroResponsabilidadeCivil: true,
      modalidadeAtendimento: 'AMBOS',
      raioAtendimentoKm: 15,
      registro: {
        categoria: 'ENFERMEIRO',
        especialidadeIds: [5, 6],
        registroProfissional: '123456',
        registroProfissionalUf: 'SP',
      },
    });

    expect(profile.registration).toEqual({
      category: 'ENFERMEIRO',
      specialtyIds: ['5', '6'],
      registrationNumber: '123456',
      registrationUf: 'SP',
    });
  });
});
