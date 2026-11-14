import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ChatEvent, ChatMessage } from './chat.model';
import { ChatService } from './chat.service';
import { ChatUnreadService } from './chat-unread.service';

const NAO_LIDAS = `${environment.apiUrl}/conversas/nao-lidas`;

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 1, senderId: 2, requestId: 74, content: 'oi', sentAt: new Date(), attachment: null, ...overrides };
}

describe('ChatUnreadService', () => {
  let service: ChatUnreadService;
  let httpMock: HttpTestingController;
  let events: Subject<ChatEvent>;

  beforeEach(() => {
    events = new Subject<ChatEvent>();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: signal({ id: '1' }) } },
        { provide: ChatService, useValue: { events$: events.asObservable() } },
      ],
    });
    service = TestBed.inject(ChatUnreadService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.flushEffects();
    httpMock.expectOne(NAO_LIDAS).flush({
      total: 3,
      canais: [
        { solicitacaoId: 74, profissionalUsuarioId: null, quantidade: 2 },
        { solicitacaoId: 74, profissionalUsuarioId: 2, quantidade: 1 },
      ],
    });
  });

  afterEach(() => httpMock.verify());

  it('carrega as não lidas de cada canal e o total para o menu', () => {
    expect(service.countOf('74/grupo')).toBe(2);
    expect(service.countOf('74/2')).toBe(1);
    expect(service.total()).toBe(3);
  });

  it('mensagem de outra pessoa num canal fechado soma no contador', () => {
    events.next({ type: 'message', message: message({ professionalUserId: 2 }) });

    expect(service.countOf('74/2')).toBe(2);
    expect(service.total()).toBe(4);
  });

  it('minha própria mensagem não conta como não lida', () => {
    events.next({ type: 'message', message: message({ senderId: 1 }) });

    expect(service.total()).toBe(3);
  });

  it('abrir o canal zera o contador dele e avisa o back', () => {
    service.open(74, null);

    expect(service.countOf('74/grupo')).toBe(0);
    const request = httpMock.expectOne(`${environment.apiUrl}/conversas/74/lida`);
    expect(request.request.params.has('profissionalUsuarioId')).toBeFalse();
    request.flush({ total: 1, canais: [{ solicitacaoId: 74, profissionalUsuarioId: 2, quantidade: 1 }] });
    expect(service.total()).toBe(1);
  });

  it('com o canal aberto, a mensagem nova já é marcada como lida', () => {
    service.open(74, 2);
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/conversas/74/lida`).flush({ total: 2, canais: [] });

    events.next({ type: 'message', message: message({ professionalUserId: 2 }) });

    const request = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/conversas/74/lida`);
    expect(request.request.params.get('profissionalUsuarioId')).toBe('2');
    request.flush({ total: 0, canais: [] });
    expect(service.total()).toBe(0);
  });
});
