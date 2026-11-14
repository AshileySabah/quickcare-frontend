import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthTokenStore } from '../auth/auth-token.store';
import { SessionExpiredService } from '../auth/session-expired.service';
import { authInterceptor } from './auth.interceptor';

const NOTIFICACOES = `${environment.apiUrl}/notificacoes`;

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokens: AuthTokenStore;
  let sessionExpired: SessionExpiredService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(AuthTokenStore);
    sessionExpired = TestBed.inject(SessionExpiredService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('guarda o token devolvido no login e manda no Authorization das próximas chamadas', () => {
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({}, { headers: { 'X-Auth-Token': 'tok-1' } });

    expect(tokens.token()).toBe('tok-1');

    http.get(NOTIFICACOES).subscribe();
    const request = httpMock.expectOne(NOTIFICACOES);
    expect(request.request.headers.get('Authorization')).toBe('Bearer tok-1');
    expect(request.request.withCredentials).toBeFalse();
    request.flush([]);
  });

  it('troca o token quando o back devolve um renovado', () => {
    localStorage.setItem('quickcare.token', 'antigo');

    http.get(NOTIFICACOES).subscribe();
    httpMock.expectOne(NOTIFICACOES).flush([], { headers: { 'X-Auth-Token': 'novo' } });

    expect(tokens.token()).toBe('novo');
  });

  it('com a sessão expirada pede para entrar de novo e repete o envio sem perder o que foi preenchido', () => {
    localStorage.setItem('quickcare.token', 'vencido');
    let resposta: unknown;
    http.post(`${environment.apiUrl}/solicitacoes`, { descricao: 'texto preenchido' }).subscribe((body) => (resposta = body));

    httpMock.expectOne(`${environment.apiUrl}/solicitacoes`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(sessionExpired.open()).toBeTrue();

    localStorage.setItem('quickcare.token', 'novo');
    sessionExpired.finish(true);

    const retry = httpMock.expectOne(`${environment.apiUrl}/solicitacoes`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer novo');
    expect(retry.request.body).toEqual({ descricao: 'texto preenchido' });
    retry.flush({ id: 1 });

    expect(resposta).toEqual({ id: 1 });
    expect(sessionExpired.open()).toBeFalse();
  });

  it('se a pessoa cancelar, devolve o erro para a tela tratar', () => {
    localStorage.setItem('quickcare.token', 'vencido');
    let status = 0;
    http.get(NOTIFICACOES).subscribe({ error: (error) => (status = error.status) });

    httpMock.expectOne(NOTIFICACOES).flush({}, { status: 401, statusText: 'Unauthorized' });
    sessionExpired.finish(false);

    expect(status).toBe(401);
  });

  it('várias chamadas com 401 ao mesmo tempo abrem um único pedido de login', () => {
    localStorage.setItem('quickcare.token', 'vencido');
    http.get(NOTIFICACOES).subscribe();
    http.get(`${environment.apiUrl}/conversas`).subscribe();

    httpMock.expectOne(NOTIFICACOES).flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(`${environment.apiUrl}/conversas`).flush({}, { status: 401, statusText: 'Unauthorized' });
    sessionExpired.finish(true);

    httpMock.expectOne(NOTIFICACOES).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/conversas`).flush([]);
  });

  it('erro de login com senha errada não abre o pedido de login', () => {
    localStorage.setItem('quickcare.token', 'tok');
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe({ error: () => undefined });

    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(sessionExpired.open()).toBeFalse();
  });

  it('não manda o token para outros domínios', () => {
    localStorage.setItem('quickcare.token', 'tok');

    http.get('https://viacep.com.br/ws/01310100/json/').subscribe();
    const request = httpMock.expectOne('https://viacep.com.br/ws/01310100/json/');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });
});
