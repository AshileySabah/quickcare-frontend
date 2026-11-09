import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LoginApiResponse } from '../auth/auth-api.model';
import { AuthService } from '../auth/auth.service';
import { SecurityOverview, User } from '../models';
import { SecurityService } from './security.service';

const BASE = `${environment.apiUrl}/seguranca`;

const SESSAO: LoginApiResponse = {
  usuarioId: 1,
  nome: 'Ana Duplo Perfil',
  email: 'ambos@quickcare.dev',
  avatarUrl: null,
  perfis: [{ tipo: 'PROFISSIONAL', status: 'ATIVO', statusValidacao: 'APROVADO' }],
  ultimoPerfil: 'PROFISSIONAL',
};

describe('SecurityService', () => {
  let service: SecurityService;
  let authService: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SecurityService);
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('mapeia os perfis ativos e os encerrados com a data limite para recuperar', () => {
    let overview!: SecurityOverview;
    service.overview().subscribe((result) => (overview = result));

    httpMock.expectOne(BASE).flush({
      email: 'ambos@quickcare.dev',
      perfis: [
        { perfil: 'PROFISSIONAL', encerrado: false },
        { perfil: 'PACIENTE', encerrado: true, encerradoEm: '2026-11-08T10:00:00Z', excluiEm: '2026-12-08T10:00:00Z' },
      ],
    });

    expect(overview).toEqual({
      email: 'ambos@quickcare.dev',
      profiles: [
        { role: 'professional', closed: false, closedAt: undefined, deletesAt: undefined },
        { role: 'patient', closed: true, closedAt: '2026-11-08T10:00:00Z', deletesAt: '2026-12-08T10:00:00Z' },
      ],
    });
  });

  it('pede o código do novo e-mail com a senha atual', () => {
    service.requestEmailCode('  novo@quickcare.dev ', 'Senha@123').subscribe();

    const request = httpMock.expectOne(`${BASE}/email/codigo`);
    expect(request.request.body).toEqual({ novoEmail: 'novo@quickcare.dev', senha: 'Senha@123' });
    request.flush({ mensagem: 'Enviamos um código.' });
  });

  it('pede o código de encerramento com o alvo no formato do back', () => {
    service.requestClosureCode('patient', 'Senha@123').subscribe();

    const request = httpMock.expectOne(`${BASE}/encerramento/codigo`);
    expect(request.request.body).toEqual({ alvo: 'PACIENTE', senha: 'Senha@123' });
    request.flush({ mensagem: 'Enviamos um código.' });
  });

  it('ao encerrar só um perfil, atualiza a sessão com o perfil que sobrou', () => {
    let user: User | null = null;
    service.close('patient', '123456').subscribe((result) => (user = result));

    const request = httpMock.expectOne(`${BASE}/encerramento`);
    expect(request.request.body).toEqual({ alvo: 'PACIENTE', codigo: '123456' });
    request.flush(SESSAO);

    expect(user!.role).toBe('professional');
    expect(authService.currentUser()?.role).toBe('professional');
  });

  it('ao encerrar a conta inteira, limpa a sessão local', () => {
    authService.applySession(SESSAO);
    let user: User | null | undefined;
    service.close('account', '123456').subscribe((result) => (user = result));

    httpMock.expectOne(`${BASE}/encerramento`).flush(null, { status: 204, statusText: 'No Content' });

    expect(user).toBeNull();
    expect(authService.currentUser()).toBeNull();
  });

  it('recupera um perfil encerrado e entra nele', () => {
    service.recoverProfile('patient').subscribe();

    const request = httpMock.expectOne((req) => req.url === `${BASE}/perfis/recuperar`);
    expect(request.request.params.get('perfil')).toBe('PACIENTE');
    request.flush({ ...SESSAO, perfis: [...SESSAO.perfis, { tipo: 'PACIENTE', status: 'ATIVO', statusValidacao: 'APROVADO' }], ultimoPerfil: 'PACIENTE' });

    expect(authService.currentUser()?.role).toBe('patient');
  });
});
