import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IMessage, StompConfig } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../models';
import { NotificationService, STOMP_CLIENT_FACTORY } from './notification.service';

const BASE_URL = `${environment.apiUrl}/notificacoes`;

function apiNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    perfil: 'PACIENTE',
    tipo: 'PROPOSTA_RECEBIDA',
    titulo: 'Nova proposta',
    mensagem: 'Carla enviou uma proposta para a sua solicitação de Curativos.',
    link: '/patient/solicitacoes/50',
    lida: false,
    criadoEm: '2026-11-01T12:00:00Z',
    ...overrides,
  };
}

class FakeStompClient {
  connected = true;
  activate = jasmine.createSpy('activate');
  deactivate = jasmine.createSpy('deactivate').and.returnValue(Promise.resolve());
  onMessage?: (message: IMessage) => void;

  constructor(readonly config: StompConfig) {}

  subscribe(_destination: string, callback: (message: IMessage) => void): void {
    this.onMessage = callback;
  }

  connect(): void {
    this.config.onConnect?.({} as never);
  }

  push(body: object): void {
    this.onMessage?.({ body: JSON.stringify(body) } as IMessage);
  }
}

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let clients: FakeStompClient[];
  const role = signal<UserRole | null>('patient');
  const currentUser = signal<{ id: string } | null>({ id: '7' });

  function flushInitialLoad(list: object[] = [], unread = { paciente: 0, profissional: 0 }): void {
    httpMock.expectOne((req) => req.url === BASE_URL && req.params.get('perfil') === 'PACIENTE').flush(list);
    httpMock.expectOne(`${BASE_URL}/nao-lidas`).flush(unread);
  }

  beforeEach(() => {
    clients = [];
    role.set('patient');
    currentUser.set({ id: '7' });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { role, currentUser } },
        {
          provide: STOMP_CLIENT_FACTORY,
          useValue: (config: StompConfig) => {
            const client = new FakeStompClient(config);
            clients.push(client);
            return client;
          },
        },
      ],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.flushEffects();
  });

  afterEach(() => httpMock.verify());

  it('carrega as do perfil em uso e conecta ao WebSocket', () => {
    flushInitialLoad([apiNotification()], { paciente: 1, profissional: 2 });

    expect(service.notifications().length).toBe(1);
    expect(service.notifications()[0].profile).toBe('patient');
    expect(service.activeUnread()).toBe(1);
    expect(service.otherUnread()).toBe(2);
    expect(clients.length).toBe(1);
    expect(clients[0].config.brokerURL).toBe(`${environment.apiUrl.replace(/^http/, 'ws')}/ws`);
    expect(clients[0].activate).toHaveBeenCalled();
  });

  it('a que chega em tempo real entra na lista do perfil em uso; a do outro só conta', () => {
    flushInitialLoad();
    clients[0].connect();

    clients[0].push(apiNotification({ id: 2 }));
    clients[0].push(apiNotification({ id: 3, perfil: 'PROFISSIONAL' }));

    expect(service.notifications().map((item) => item.id)).toEqual(['2']);
    expect(service.unread()).toEqual({ patient: 1, professional: 1 });
  });

  it('marcar como lida atualiza a lista e o contador', () => {
    flushInitialLoad([apiNotification()], { paciente: 1, profissional: 0 });

    service.markAsRead(service.notifications()[0]).subscribe();
    httpMock.expectOne(`${BASE_URL}/1/lida`).flush(apiNotification({ lida: true }));

    expect(service.notifications()[0].read).toBeTrue();
    expect(service.activeUnread()).toBe(0);
  });

  it('marcar todas usa o perfil em uso', () => {
    flushInitialLoad([apiNotification(), apiNotification({ id: 2 })], { paciente: 2, profissional: 1 });

    service.markAllAsRead().subscribe();
    const req = httpMock.expectOne((request) => request.url === `${BASE_URL}/lidas`);
    expect(req.request.params.get('perfil')).toBe('PACIENTE');
    req.flush({ paciente: 0, profissional: 1 });

    expect(service.notifications().every((item) => item.read)).toBeTrue();
    expect(service.unread()).toEqual({ patient: 0, professional: 1 });
  });

  it('ao sair, desconecta e limpa tudo', () => {
    flushInitialLoad([apiNotification()], { paciente: 1, profissional: 0 });

    currentUser.set(null);
    role.set(null);
    TestBed.flushEffects();

    expect(clients[0].deactivate).toHaveBeenCalled();
    expect(service.notifications()).toEqual([]);
    expect(service.activeUnread()).toBe(0);
  });

  it('o admin não tem notificações', () => {
    flushInitialLoad();
    role.set('admin');
    TestBed.flushEffects();

    expect(service.activeRole()).toBeNull();
    expect(clients[0].deactivate).toHaveBeenCalled();
  });
});
