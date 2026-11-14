import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
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
import { Subject, catchError, debounceTime, filter, map, merge, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatParticipant, Conversation } from '../../../core/chat/chat.model';
import { ChatService } from '../../../core/chat/chat.service';
import { ChatUnreadService } from '../../../core/chat/chat-unread.service';
import {
  channelSegment,
  conversationKey,
  messageKey,
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
  protected readonly openKey = signal<string | null>(null);
  protected readonly unread = inject(ChatUnreadService).counts;

  protected readonly basePath = computed(() =>
    this.authService.role() === 'professional'
      ? '/professional/mensagens'
      : '/patient/mensagens',
  );
  protected readonly searchResults = signal<Conversation[] | null>(null);
  protected readonly searching = signal(false);
  protected readonly filtered = computed(() => this.searchResults() ?? this.conversations());

  protected readonly shortTime = shortTime;

  private readonly searchRefresh = new Subject<void>();

  constructor() {
    this.load();

    merge(toObservable(this.search).pipe(debounceTime(300)), this.searchRefresh)
      .pipe(
        map(() => this.search().trim()),
        tap((term) => this.searching.set(!!term)),
        switchMap((term) =>
          term
            ? this.chatService.conversations(this.meId, term).pipe(catchError(() => of([] as Conversation[])))
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.searching.set(false);
      });

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
      if (this.search().trim()) {
        this.searchRefresh.next();
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
    if (this.search().trim()) {
      this.searchRefresh.next();
    }
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