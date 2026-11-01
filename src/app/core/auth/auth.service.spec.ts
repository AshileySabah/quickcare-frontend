import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LoginApiResponse, PerfilStatusApi } from './auth-api.model';
import { AuthService } from './auth.service';

const LOGIN_URL = `${environment.apiUrl}/auth/login`;
const ACTIVE_PROFILE_URL = `${environment.apiUrl}/auth/perfil-ativo`;

const PACIENTE: PerfilStatusApi = { tipo: 'PACIENTE', status: 'ATIVO', statusValidacao: 'APROVADO' };
const PROFISSIONAL: PerfilStatusApi = { tipo: 'PROFISSIONAL', status: 'ATIVO', statusValidacao: 'PENDENTE' };

function session(overrides: Partial<LoginApiResponse> = {}): LoginApiResponse {
  return {
    usuarioId: 1,
    nome: 'Ana Duplo Perfil',
    email: 'ambos@quickcare.dev',
    avatarUrl: null,
    perfis: [PACIENTE, PROFISSIONAL],
    ultimoPerfil: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function login(response: LoginApiResponse): void {
    service.login('ambos@quickcare.dev', 'Senha@123').subscribe();
    httpMock.expectOne(LOGIN_URL).flush(response);
  }

  it('abre no último perfil usado quando ele está ativo', () => {
    login(session({ ultimoPerfil: 'PACIENTE' }));

    expect(service.currentUser()?.role).toBe('patient');
    expect(service.profiles()).toEqual([
      { role: 'patient', banned: false, validationStatus: 'aprovado' },
      { role: 'professional', banned: false, validationStatus: 'pendente' },
    ]);
  });

  it('sem último perfil, abre no profissional antes do paciente', () => {
    login(session());

    expect(service.currentUser()?.role).toBe('professional');
  });

  it('ignora o último perfil se ele foi banido', () => {
    login(session({ ultimoPerfil: 'PACIENTE', perfis: [{ ...PACIENTE, status: 'BANIDO' }, PROFISSIONAL] }));

    expect(service.currentUser()?.role).toBe('professional');
    expect(service.profiles()[0].banned).toBeTrue();
  });

  it('troca de perfil pelo back e atualiza a sessão', () => {
    login(session({ ultimoPerfil: 'PROFISSIONAL' }));
    let role: string | undefined;

    service.switchProfile('patient').subscribe((user) => (role = user.role));
    const req = httpMock.expectOne(ACTIVE_PROFILE_URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ perfil: 'PACIENTE' });
    req.flush(session({ ultimoPerfil: 'PACIENTE' }));

    expect(role).toBe('patient');
    expect(service.currentUser()?.role).toBe('patient');
  });

  it('não chama o back ao escolher o perfil que já está em uso', () => {
    login(session({ ultimoPerfil: 'PACIENTE' }));

    service.switchProfile('patient').subscribe();

    httpMock.expectNone(ACTIVE_PROFILE_URL);
  });

  it('cria o outro perfil só com os dados do perfil e já entra nele', () => {
    login(session({ perfis: [PACIENTE], ultimoPerfil: 'PACIENTE' }));
    const file = new File(['conteudo'], 'rg.pdf', { type: 'application/pdf' });

    service
      .createProfessionalProfile({
        category: 'CUIDADOR',
        specialtyIds: ['7'],
        birthDate: '1985-07-02',
        gender: 'FEMININO',
        emergencyContacts: [],
        infoConfirmedTrue: true,
        lgpdConsent: true,
        hasLiabilityInsurance: false,
        modalidadeAtendimento: 'PRESENCIAL',
        raioAtendimentoKm: 10,
        address: {
          cep: '01310100',
          street: 'Avenida Paulista',
          number: '1500',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        },
        documents: [{ file, type: 'VALIDACAO_CPF' }],
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/perfis/profissional`);
    const formData = req.request.body as FormData;
    expect(formData.getAll('tiposDocumento')).toEqual(['VALIDACAO_CPF']);
    req.flush(session({ perfis: [PACIENTE, PROFISSIONAL], ultimoPerfil: 'PROFISSIONAL' }));

    expect(service.currentUser()?.role).toBe('professional');
    expect(service.profiles().length).toBe(2);
  });

  it('atualiza o status de validação também no resumo do perfil', () => {
    login(session({ ultimoPerfil: 'PROFISSIONAL' }));

    service.updateValidationStatus('aprovado');

    expect(service.profiles().find((profile) => profile.role === 'professional')?.validationStatus).toBe('aprovado');
  });
});
