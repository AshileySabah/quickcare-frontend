import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, computed, effect, inject, signal, untracked } from '@angular/core';
import { Client, IMessage, StompConfig } from '@stomp/stompjs';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { normalizeError } from '../http/api-error';
import { AppNotification, NotificationType, SwitchableRole, UnreadCounts } from '../models';

type PerfilApi = 'PACIENTE' | 'PROFISSIONAL';

interface NotificacaoApiResponse {
  id: number;
  perfil: PerfilApi;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  criadoEm: string;
}

interface NaoLidasApiResponse {
  paciente: number;
  profissional: number;
}

const ROLE_BY_PERFIL: Record<PerfilApi, SwitchableRole> = { PACIENTE: 'patient', PROFISSIONAL: 'professional' };
const PERFIL_BY_ROLE: Record<SwitchableRole, PerfilApi> = { patient: 'PACIENTE', professional: 'PROFISSIONAL' };
const NO_UNREAD: UnreadCounts = { patient: 0, professional: 0 };
const QUEUE = '/user/queue/notificacoes';
const RECONNECT_DELAY_MS = 10_000;
const HEARTBEAT_MS = 10_000;

export const STOMP_CLIENT_FACTORY = new InjectionToken<(config: StompConfig) => Client>('STOMP_CLIENT_FACTORY', {
  providedIn: 'root',
  factory: () => (config) => new Client(config),
});

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly createClient = inject(STOMP_CLIENT_FACTORY);
  private readonly baseUrl = `${environment.apiUrl}/notificacoes`;

  private readonly notificationsSignal = signal<AppNotification[]>([]);
  private readonly unreadSignal = signal<UnreadCounts>(NO_UNREAD);
  private readonly loadingSignal = signal(false);
  private readonly failedSignal = signal(false);
  private client: Client | null = null;
  private connectedBefore = false;

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly unread = this.unreadSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly failed = this.failedSignal.asReadonly();

  readonly activeRole = computed<SwitchableRole | null>(() => {
    const role = this.authService.role();
    return role === 'patient' || role === 'professional' ? role : null;
  });
  readonly activeUnread = computed(() => {
    const role = this.activeRole();
    return role ? this.unreadSignal()[role] : 0;
  });
  readonly otherUnread = computed(() => {
    const role = this.activeRole();
    return role ? this.unreadSignal()[role === 'patient' ? 'professional' : 'patient'] : 0;
  });

  private readonly sessionKey = computed(() => {
    const user = this.authService.currentUser();
    const role = this.activeRole();
    return user && role ? `${user.id}:${role}` : null;
  });

  constructor() {
    effect(() => {
      const key = this.sessionKey();
      untracked(() => (key ? this.start() : this.stop()));
    });
  }

  reload(): void {
    const role = this.activeRole();
    if (!role) {
      return;
    }

    this.loadingSignal.set(true);
    this.failedSignal.set(false);
    this.list(role).subscribe({
      next: (notifications) => {
        if (this.activeRole() === role) {
          this.notificationsSignal.set(notifications);
        }
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadingSignal.set(false);
        this.failedSignal.set(true);
      },
    });
    this.loadUnread().subscribe({ error: () => undefined });
  }

  markAsRead(notification: AppNotification): Observable<void> {
    if (notification.read) {
      return of(undefined);
    }

    return this.http.patch<NotificacaoApiResponse>(`${this.baseUrl}/${notification.id}/lida`, {}).pipe(
      tap(() => {
        this.notificationsSignal.update((list) =>
          list.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
        );
        this.unreadSignal.update((counts) => ({
          ...counts,
          [notification.profile]: Math.max(0, counts[notification.profile] - 1),
        }));
      }),
      map(() => undefined),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível marcar como lida.'))),
    );
  }

  markAllAsRead(): Observable<void> {
    const role = this.activeRole();
    if (!role) {
      return of(undefined);
    }

    return this.http
      .patch<NaoLidasApiResponse>(`${this.baseUrl}/lidas`, {}, { params: { perfil: PERFIL_BY_ROLE[role] } })
      .pipe(
        tap((counts) => {
          this.unreadSignal.set(toUnreadCounts(counts));
          this.notificationsSignal.update((list) => list.map((item) => ({ ...item, read: true })));
        }),
        map(() => undefined),
        catchError((error: unknown) =>
          throwError(() => normalizeError(error, 'Não foi possível marcar as notificações como lidas.')),
        ),
      );
  }

  private list(role: SwitchableRole): Observable<AppNotification[]> {
    return this.http
      .get<NotificacaoApiResponse[]>(this.baseUrl, { params: { perfil: PERFIL_BY_ROLE[role] } })
      .pipe(map((response) => response.map(toNotification)));
  }

  private loadUnread(): Observable<UnreadCounts> {
    return this.http.get<NaoLidasApiResponse>(`${this.baseUrl}/nao-lidas`).pipe(
      map(toUnreadCounts),
      tap((counts) => this.unreadSignal.set(counts)),
    );
  }

  private start(): void {
    this.notificationsSignal.set([]);
    this.reload();

    if (this.client) {
      return;
    }

    this.client = this.createClient({
      brokerURL: `${environment.apiUrl.replace(/^http/, 'ws')}/ws`,
      reconnectDelay: RECONNECT_DELAY_MS,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      beforeConnect: async () => {
        await firstValueFrom(this.loadUnread()).catch(() => undefined);
      },
      onConnect: () => {
        this.client?.subscribe(QUEUE, (message) => this.receive(message));
        if (this.connectedBefore) {
          this.reload();
        }
        this.connectedBefore = true;
      },
    });
    this.client.activate();
  }

  private stop(): void {
    void this.client?.deactivate();
    this.client = null;
    this.connectedBefore = false;
    this.notificationsSignal.set([]);
    this.unreadSignal.set(NO_UNREAD);
  }

  private receive(message: IMessage): void {
    const notification = toNotification(JSON.parse(message.body) as NotificacaoApiResponse);

    this.unreadSignal.update((counts) => ({
      ...counts,
      [notification.profile]: counts[notification.profile] + (notification.read ? 0 : 1),
    }));
    if (notification.profile === this.activeRole()) {
      this.notificationsSignal.update((list) => [notification, ...list.filter((item) => item.id !== notification.id)]);
    }
  }
}

function toNotification(response: NotificacaoApiResponse): AppNotification {
  return {
    id: String(response.id),
    profile: ROLE_BY_PERFIL[response.perfil],
    type: response.tipo.toLowerCase() as NotificationType,
    title: response.titulo,
    message: response.mensagem,
    link: response.link ?? undefined,
    read: response.lida,
    createdAt: response.criadoEm,
  };
}

function toUnreadCounts(response: NaoLidasApiResponse): UnreadCounts {
  return { patient: response.paciente, professional: response.profissional };
}
