import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Observable, Subject, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatEvent,
  ChatMessage,
  ChatMessageApi,
  ChatMessageDeletedApi,
  Conversation,
  ConversationApi,
} from './chat.model';
import { toChatMessage, toConversation, toWebSocketUrl } from './chat.utils';

const QUEUE = '/user/queue/mensagens';

/** Erro do chat com o status HTTP, para a tela distinguir "sem acesso" (403) de falha comum. */
export class ChatError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly conversationsUrl = `${environment.apiUrl}/conversas`;
  private readonly messagesUrl = `${environment.apiUrl}/mensagens`;

  private client: Client | null = null;
  private consumers = 0;
  private readonly eventsSubject = new Subject<ChatEvent>();

  readonly events$ = this.eventsSubject.asObservable();
  readonly connected = signal(false);

  /** Canais do usuario logado: conversas individuais e grupos das solicitacoes com proposta aceita. */
  conversations(currentUserId: number): Observable<Conversation[]> {
    return this.http.get<ConversationApi[]>(this.conversationsUrl, { withCredentials: true }).pipe(
      map((items) => items.map((item) => toConversation(item, currentUserId))),
      catchError((error) => throwError(() => this.normalizeError(error))),
    );
  }

  /** Historico do canal: o grupo quando professionalUserId e nulo, ou a conversa individual com esse profissional. */
  messages(requestId: number, professionalUserId: number | null = null): Observable<ChatMessage[]> {
    let params = new HttpParams();
    if (professionalUserId !== null) {
      params = params.set('profissionalUsuarioId', professionalUserId);
    }
    return this.http
      .get<ChatMessageApi[]>(`${this.conversationsUrl}/${requestId}/mensagens`, { params, withCredentials: true })
      .pipe(
        map((items) => items.map(toChatMessage)),
        catchError((error) => throwError(() => this.normalizeError(error))),
      );
  }

  /** O back espera multipart: parte "dados" (JSON) e, opcionalmente, a parte "arquivo". */
  send(
    requestId: number,
    content: string,
    file: File | null = null,
    professionalUserId: number | null = null,
  ): Observable<ChatMessage> {
    const body = new FormData();
    body.append(
      'dados',
      new Blob([JSON.stringify({ solicitacaoId: requestId, profissionalUsuarioId: professionalUserId, conteudo: content })], {
        type: 'application/json',
      }),
    );
    if (file) {
      body.append('arquivo', file);
    }

    return this.http.post<ChatMessageApi>(this.messagesUrl, body, { withCredentials: true }).pipe(
      map(toChatMessage),
      // Avisa as outras telas (ex.: a lista de conversas) sobre a mensagem enviada por este usuario.
      tap((message) => this.eventsSubject.next({ type: 'message', message })),
      catchError((error) => throwError(() => this.normalizeError(error))),
    );
  }

  remove(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.messagesUrl}/${messageId}`, { withCredentials: true }).pipe(
      tap(() => this.eventsSubject.next({ type: 'deleted', id: messageId })),
      catchError((error) => throwError(() => this.normalizeError(error))),
    );
  }

  /** Cada tela que escuta chama connect() e, ao sair, disconnect(). */
  connect(): void {
    this.consumers++;
    if (this.client) {
      return;
    }

    const client = new Client({
      brokerURL: toWebSocketUrl(environment.apiUrl),
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

  private normalizeError(error: unknown): ChatError {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 413) {
        return new ChatError('O arquivo é maior que o limite permitido.', 413);
      }
      const message = (error.error as { message?: string } | null)?.message;
      if (error.status === 403) {
        return new ChatError(message ?? 'Você não pode enviar mensagens nesta conversa.', 403);
      }
      return new ChatError(message ?? 'Não foi possível concluir a operação no chat.', error.status);
    }
    return new ChatError('Erro inesperado no chat.');
  }
}