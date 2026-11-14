import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ChatUnreadApi } from './chat.model';
import { ChatService } from './chat.service';
import { channelKey, messageKey } from './chat.utils';

@Injectable({ providedIn: 'root' })
export class ChatUnreadService {
  private readonly http = inject(HttpClient);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/conversas`;

  private readonly countsSignal = signal<Record<string, number>>({});
  private openKey: string | null = null;

  readonly counts = this.countsSignal.asReadonly();
  readonly total = computed(() => Object.values(this.countsSignal()).reduce((sum, count) => sum + count, 0));

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => (user ? this.reload() : this.countsSignal.set({})));
    });

    this.chatService.events$.subscribe((event) => {
      if (event.type === 'deleted') {
        this.reload();
        return;
      }
      const meId = Number(this.authService.currentUser()?.id);
      if (event.message.senderId === meId) {
        return;
      }
      const key = messageKey(event.message);
      if (key === this.openKey) {
        this.markAsRead(event.message.requestId, event.message.professionalUserId ?? null);
        return;
      }
      this.countsSignal.update((counts) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 }));
    });
  }

  countOf(key: string): number {
    return this.countsSignal()[key] ?? 0;
  }

  reload(): void {
    this.http.get<ChatUnreadApi>(`${this.baseUrl}/nao-lidas`).subscribe({
      next: (response) => this.countsSignal.set(toCounts(response)),
      error: () => undefined,
    });
  }

  open(requestId: number, professionalUserId: number | null): void {
    this.openKey = channelKey(requestId, professionalUserId);
    this.markAsRead(requestId, professionalUserId);
  }

  close(requestId: number, professionalUserId: number | null): void {
    if (this.openKey === channelKey(requestId, professionalUserId)) {
      this.openKey = null;
    }
  }

  private markAsRead(requestId: number, professionalUserId: number | null): void {
    const key = channelKey(requestId, professionalUserId);
    this.countsSignal.update((counts) => {
      const next = { ...counts };
      delete next[key];
      return next;
    });
    let params = new HttpParams();
    if (professionalUserId !== null) {
      params = params.set('profissionalUsuarioId', professionalUserId);
    }
    this.http.post<ChatUnreadApi>(`${this.baseUrl}/${requestId}/lida`, {}, { params }).subscribe({
      next: (response) => this.countsSignal.set(toCounts(response)),
      error: () => undefined,
    });
  }
}

function toCounts(response: ChatUnreadApi): Record<string, number> {
  return Object.fromEntries(
    response.canais.map((canal) => [channelKey(canal.solicitacaoId, canal.profissionalUsuarioId), canal.quantidade]),
  );
}
