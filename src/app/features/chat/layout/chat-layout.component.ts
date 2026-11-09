import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatParticipant, Conversation } from '../../../core/chat/chat.model';
import { ChatService } from '../../../core/chat/chat.service';
import {
  channelSegment,
  conversationKey,
  messageKey,
  normalizeText,
  shortTime,
  sortConversations,
  withLastMessage,
} from '../../../core/chat/chat.utils';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { ChatAvatarComponent } from '../avatar/chat-avatar.component';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

/** Lista de conversas a esquerda e, a direita, a conversa aberta (rota filha). */
@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ChatAvatarComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './chat-layout.component.html',
  styleUrl: './chat-layout.component.scss',
})
export class ChatLayoutComponent {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly meId = Number(this.authService.currentUser()?.id);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly conversations = signal<Conversation[]>([]);
  protected readonly search = signal('');
  protected readonly openId = signal<number | null>(null);
  /** Canal aberto (solicitacao + grupo ou profissional); nulo quando nenhum esta aberto. */
  protected readonly openKey = signal<string | null>(null);
  /** Mensagens novas em conversas que nao estao abertas, por canal. So vale nesta sessao da tela. */
  protected readonly unread = signal<Record<string, number>>({});

  protected readonly basePath = computed(() =>
    this.authService.role() === 'professional'
      ? '/professional/mensagens'
      : '/patient/mensagens',
  );
  protected readonly filtered = computed(() => {
    const query = normalizeText(this.search());
    const list = this.conversations();
    return query
      ? list.filter((item) => normalizeText(item.title).includes(query))
      : list;
  });

  protected readonly shortTime = shortTime;

  constructor() {
    this.load();

    this.chatService.connect();
    this.destroyRef.onDestroy(() => this.chatService.disconnect());

    this.chatService.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'deleted') {
        this.refresh();
        return;
      }

      const message = event.message;
      const key = messageKey(message);
      if (!this.conversations().some((item) => conversationKey(item) === key)) {
        this.refresh();
        return;
      }

      this.conversations.update((list) =>
        sortConversations(
          list.map((item) =>
            conversationKey(item) === key
              ? withLastMessage(item, message, this.meId)
              : item,
          ),
        ),
      );

      if (message.senderId !== this.meId && key !== this.openKey()) {
        this.unread.update((counts) => ({
          ...counts,
          [key]: (counts[key] ?? 0) + 1,
        }));
      }
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.syncOpenId());
    this.syncOpenId();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.fetch();
  }

  /** Recarrega sem mostrar o esqueleto (a lista continua na tela). */
  private refresh(): void {
    this.fetch();
  }

  private fetch(): void {
    this.chatService.conversations(this.meId).subscribe({
      next: (items) => {
        this.conversations.set(sortConversations(items));
        this.viewState.set(items.length === 0 ? 'empty' : 'filled');
      },
      error: () => {
        if (this.viewState() === 'loading') {
          this.viewState.set('error');
        }
      },
    });
  }

  private syncOpenId(): void {
    const params = this.route.firstChild?.snapshot?.paramMap;
    const raw = params?.get('solicitacaoId');
    const id = raw ? Number(raw) : null;
    const channel = params?.get('canal');
    const key = id !== null && channel ? `${id}/${channel}` : null;
    this.openId.set(id);
    this.openKey.set(key);

    if (key !== null && this.unread()[key]) {
      this.unread.update((counts) => {
        const next = { ...counts };
        delete next[key];
        return next;
      });
    }
  }

  protected keyOf(conversation: Conversation): string {
    return conversationKey(conversation);
  }

  protected linkOf(conversation: Conversation): (string | number)[] {
    return [this.basePath(), conversation.requestId, channelSegment(conversation.professionalUserId)];
  }

  protected firstOther(
    conversation: Conversation,
  ): ChatParticipant | undefined {
    return conversation.others[0];
  }

  protected fallbackLine(conversation: Conversation): string {
    return conversation.isGroup
      ? `Grupo com ${conversation.participants.length} pessoas`
      : 'Sem mensagens ainda';
  }
}