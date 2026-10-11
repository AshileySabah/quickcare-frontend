import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatEvent,
  ChatMessage,
  ChatMessageApi,
  ChatMessageDeletedApi,
} from './chat.model';
import { toChatMessage } from './chat.utils';

const QUEUE = '/user/queue/mensagens';

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/mensagens`;

  private client: Client | null = null;
  private consumers = 0;
  private readonly eventsSubject = new Subject<ChatEvent>();

  readonly events$ = this.eventsSubject.asObservable();
  readonly connected = signal(false);

  list(): Observable<ChatMessage[]> {
    return this.http
      .get<ChatMessageApi[]>(this.baseUrl, { withCredentials: true })
      .pipe(
        map((items) => items.map(toChatMessage)),
        catchError((error) => throwError(() => this.normalizeError(error))),
      );
  }

  send(recipientId: number, content: string): Observable<ChatMessage> {
    return this.http
      .post<ChatMessageApi>(
        this.baseUrl,
        { destinatarioId: recipientId, conteudo: content },
        { withCredentials: true },
      )
      .pipe(
        map(toChatMessage),
        catchError((error) => throwError(() => this.normalizeError(error))),
      );
  }

  remove(messageId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${messageId}`, { withCredentials: true })
      .pipe(catchError((error) => throwError(() => this.normalizeError(error))));
  }

  /** Cada tela que escuta chama connect() e, ao sair, disconnect(). */
  connect(): void {
    this.consumers++;
    if (this.client) {
      return;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/websocket`),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      this.connected.set(true);
      client.subscribe(QUEUE, (frame) => {
        const payload = JSON.parse(frame.body) as ChatMessageApi | ChatMessageDeletedApi;
        if ('excluida' in payload) {
          this.eventsSubject.next({ type: 'deleted', id: payload.id });
        } else {
          this.eventsSubject.next({ type: 'message', message: toChatMessage(payload) });
        }
      });
    };
    client.onWebSocketClose = () => this.connected.set(false);

    client.activate();
    this.client = client;
  }

  disconnect(): void {
    this.consumers = Math.max(0, this.consumers - 1);
    if (this.consumers === 0 && this.client) {
      void this.client.deactivate();
      this.client = null;
      this.connected.set(false);
    }
  }

  ngOnDestroy(): void {
    void this.client?.deactivate();
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      const message = (error.error as { message?: string } | null)?.message;
      return new Error(message ?? 'Nao foi possivel concluir a operacao no chat.');
    }
    return new Error('Erro inesperado no chat.');
  }
}
