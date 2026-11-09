import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LoginApiResponse, PerfilStatusApi } from './auth-api.model';
import { AuthService, ClosedAccountError } from './auth.service';

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

  it('avisa que a conta está encerrada quando o back responde 423', () => {
    let erro: Error | undefined;
    service.login('ambos@quickcare.dev', 'Senha@123').subscribe({ error: (error: Error) => (erro = error) });

    httpMock
      .expectOne(LOGIN_URL)
      .flush({ message: 'Sua conta foi encerrada e será excluída em 08/12/2026.' }, { status: 423, statusText: 'Locked' });

    expect(erro).toBeInstanceOf(ClosedAccountError);
    expect(erro?.message).toContain('08/12/2026');
    expect(service.currentUser()).toBeNull();
  });

  it('recupera a conta com e-mail e senha e já entra nela', () => {
    service.recoverAccount('ambos@quickcare.dev', 'Senha@123').subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/conta/recuperar`);
    expect(request.request.body).toEqual({ email: 'ambos@quickcare.dev', senha: 'Senha@123' });
    request.flush(session({ ultimoPerfil: 'PACIENTE' }));

    expect(service.currentUser()?.role).toBe('patient');
  });

  it('desfaz a troca de e-mail com a senha anterior e devolve o token para criar a senha nova', () => {
    let resetToken = '';
    service.undoEmailChange('tok', 'Antiga@123').subscribe((token) => (resetToken = token));

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/email/desfazer`);
    expect(request.request.body).toEqual({ token: 'tok', senha: 'Antiga@123' });
    request.flush({ tokenRedefinicao: 'reset-123' });

    expect(resetToken).toBe('reset-123');
  });

  it('recupera a conta pelo link do e-mail', () => {
    service.recoverAccountByLink('token-123').subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/conta/recuperar-por-link`);
    expect(request.request.body).toEqual({ token: 'token-123' });
    request.flush(session({ perfis: [PACIENTE], ultimoPerfil: 'PACIENTE' }));

    expect(service.currentUser()?.role).toBe('patient');
  });

  it('ignora o último perfil se ele foi banido', () => {
    login(session({ ultimoPerfil: 'PACIENTE', perfis: [{ ...PACIENTE, status: 'BANIDO' }, PROFISSIONAL] }));

    expect(service.currentUser()?.role).toBe('professional');
    expect(service.profiles()[0].banned).toBeTrue();
  });

  it('com só o perfil banido, entra nele para consulta', () => {
    login(session({ ultimoPerfil: 'PACIENTE', perfis: [{ ...PACIENTE, status: 'BANIDO' }] }));

    expect(service.currentUser()?.role).toBe('patient');
  });

  it('trocar para o perfil banido abre nele', () => {
    login(session({ ultimoPerfil: 'PROFISSIONAL', perfis: [{ ...PACIENTE, status: 'BANIDO' }, PROFISSIONAL] }));

    service.switchProfile('patient').subscribe();
    httpMock
      .expectOne(ACTIVE_PROFILE_URL)
      .flush(session({ ultimoPerfil: 'PACIENTE', perfis: [{ ...PACIENTE, status: 'BANIDO' }, PROFISSIONAL] }));

    expect(service.currentUser()?.role).toBe('patient');
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
        practiceAreas: [{ category: 'CUIDADOR', specialtyIds: ['7'] }],
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

  it('manda as atuações e o documento de registro de cada uma na ordem', async () => {
    login(session({ perfis: [PACIENTE], ultimoPerfil: 'PACIENTE' }));
    const cpf = new File(['a'], 'cpf.pdf', { type: 'application/pdf' });
    const coren = new File(['b'], 'coren.pdf', { type: 'application/pdf' });
    const crp = new File(['c'], 'crp.pdf', { type: 'application/pdf' });

    service
      .createProfessionalProfile({
        practiceAreas: [
          { category: 'ENFERMEIRO', specialtyIds: ['5'], registrationNumber: '123', registrationUf: 'SP', document: coren },
          { category: 'CUIDADOR', specialtyIds: ['15'] },
          { category: 'OUTRO', specialtyIds: ['18'], registrationNumber: 'CRP 1', registrationUf: 'SP', document: crp },
        ],
        birthDate: '1985-07-02',
        gender: 'FEMININO',
        emergencyContacts: [],
        infoConfirmedTrue: true,
        lgpdConsent: true,
        hasLiabilityInsurance: false,
        modalidadeAtendimento: 'REMOTO',
        address: {
          cep: '01310100',
          street: 'Avenida Paulista',
          number: '1500',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        },
        documents: [{ file: cpf, type: 'COMPROVANTE_CPF' }],
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/perfis/profissional`);
    const formData = req.request.body as FormData;
    expect(formData.getAll('tiposDocumento')).toEqual([
      'COMPROVANTE_CPF',
      'REGISTRO_PROFISSIONAL',
      'REGISTRO_PROFISSIONAL',
    ]);
    expect((formData.getAll('documentos') as File[]).map((documento) => documento.name)).toEqual([
      'cpf.pdf',
      'coren.pdf',
      'crp.pdf',
    ]);
    const dados = JSON.parse(await (formData.get('dados') as Blob).text());
    expect(dados.atuacoes).toEqual([
      { categoria: 'ENFERMEIRO', especialidadeIds: [5], registroProfissional: '123', registroProfissionalUf: 'SP' },
      { categoria: 'CUIDADOR', especialidadeIds: [15] },
      { categoria: 'OUTRO', especialidadeIds: [18], registroProfissional: 'CRP 1', registroProfissionalUf: 'SP' },
    ]);
    req.flush(session({ perfis: [PACIENTE, PROFISSIONAL], ultimoPerfil: 'PROFISSIONAL' }));
  });

  it('atualiza o status de validação também no resumo do perfil', () => {
    login(session({ ultimoPerfil: 'PROFISSIONAL' }));

    service.updateValidationStatus('aprovado');

    expect(service.profiles().find((profile) => profile.role === 'professional')?.validationStatus).toBe('aprovado');
  });
});
