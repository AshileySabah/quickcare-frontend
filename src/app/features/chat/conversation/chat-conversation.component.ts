import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatMessage, Conversation } from '../../../core/chat/chat.model';
import { ChatError, ChatService } from '../../../core/chat/chat.service';
import { CHAT_ATTACHMENT_ACCEPT, buildTimeline, mergeMessage, validateAttachment } from '../../../core/chat/chat.utils';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { ChatAvatarComponent } from '../avatar/chat-avatar.component';
import { ChatInfoPanelComponent } from '../info-panel/chat-info-panel.component';

type ViewState = 'loading' | 'error' | 'forbidden' | 'ready';

/** Intervalo minimo entre recargas disparadas por anexo que falhou ao carregar. */
const ATTACHMENT_REFRESH_INTERVAL_MS = 60_000;

@Component({
  selector: 'app-chat-conversation',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonComponent,
    ChatAvatarComponent,
    ChatInfoPanelComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './chat-conversation.component.html',
  styleUrl: './chat-conversation.component.scss',
})
export class ChatConversationComponent {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly listRef = viewChild<ElementRef<HTMLElement>>('list');
  private lastAttachmentRefresh = 0;
  private loadSubscription: Subscription | null = null;

  protected readonly meId = Number(this.authService.currentUser()?.id);

  protected readonly requestId = signal(0);
  protected readonly viewState = signal<ViewState>('loading');
  protected readonly conversation = signal<Conversation | null>(null);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly draft = signal('');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly sending = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly messageToDelete = signal<ChatMessage | null>(null);
  protected readonly deleting = signal(false);
  protected readonly infoOpen = signal(typeof window !== 'undefined' && window.innerWidth >= 1200);
  protected readonly connected = this.chatService.connected;
  protected readonly accept = CHAT_ATTACHMENT_ACCEPT;
  protected readonly deleteConsequences = ['A mensagem some para todos os participantes da conversa.'];

  protected readonly canSend = computed(() => !!this.draft().trim() || !!this.selectedFile());
  protected readonly timeline = computed(() => buildTimeline(this.messages(), this.conversation(), this.meId));
  protected readonly basePath = computed(() =>
    this.authService.role() === 'professional' ? '/professional/mensagens' : '/patient/mensagens',
  );
  protected readonly headerPerson = computed(() => this.conversation()?.others[0] ?? null);
  protected readonly subtitle = computed(() => {
    const conversation = this.conversation();
    if (!conversation) return '';
    if (!conversation.isGroup) return `Solicitação #${this.requestId()}`;
    return conversation.participants.map((p) => (p.userId === this.meId ? 'Você' : p.name)).join(', ');
  });

  constructor() {
    // A rota reaproveita este componente ao trocar de conversa, entao reagimos ao parametro.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.requestId.set(Number(params.get('solicitacaoId')));
      this.conversation.set(null);
      this.messages.set([]);
      this.draft.set('');
      this.selectedFile.set(null);
      this.actionError.set(null);
      this.load();
    });

    this.chatService.connect();
    this.destroyRef.onDestroy(() => {
      this.loadSubscription?.unsubscribe();
      this.chatService.disconnect();
    });

    this.chatService.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'message') {
        if (event.message.requestId === this.requestId()) {
          this.messages.update((list) => mergeMessage(list, event.message));
        }
      } else {
        this.messages.update((list) => list.filter((item) => item.id !== event.id));
      }
    });

    effect(() => {
      this.timeline();
      setTimeout(() => this.scrollToBottom());
    });
  }

  protected load(): void {
    this.loadSubscription?.unsubscribe();
    this.viewState.set('loading');
    const id = this.requestId();

    this.loadSubscription = forkJoin({
      conversations: this.chatService.conversations(this.meId),
      messages: this.chatService.messages(id),
    }).subscribe({
      next: ({ conversations, messages }) => {
        const conversation = conversations.find((item) => item.requestId === id) ?? null;
        if (!conversation) {
          this.viewState.set('forbidden');
          return;
        }
        this.conversation.set(conversation);
        this.messages.set(messages);
        this.viewState.set('ready');
      },
      error: (error: ChatError) => this.viewState.set(error.status === 403 ? 'forbidden' : 'error'),
    });
  }

  protected scrollToBottom(): void {
    const el = this.listRef()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  protected toggleInfo(): void {
    this.infoOpen.update((open) => !open);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    // Limpa o input para permitir escolher o mesmo arquivo de novo depois.
    input.value = '';

    if (!file) {
      return;
    }

    const error = validateAttachment(file);
    if (error) {
      this.actionError.set(error);
      return;
    }

    this.actionError.set(null);
    this.selectedFile.set(file);
  }

  protected clearFile(): void {
    this.selectedFile.set(null);
  }

  protected send(): void {
    const content = this.draft().trim();
    const file = this.selectedFile();
    if ((!content && !file) || this.sending()) {
      return;
    }

    this.sending.set(true);
    this.actionError.set(null);

    this.chatService.send(this.requestId(), content, file).subscribe({
      next: (message) => {
        this.messages.update((list) => mergeMessage(list, message));
        this.draft.set('');
        this.selectedFile.set(null);
        this.sending.set(false);
      },
      error: (error: ChatError) => {
        this.sending.set(false);
        if (error.status === 403) {
          this.viewState.set('forbidden');
          return;
        }
        this.actionError.set(error.message);
      },
    });
  }

  protected onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }
    keyboardEvent.preventDefault();
    this.send();
  }

  protected confirmDelete(): void {
    const message = this.messageToDelete();
    if (!message) {
      return;
    }

    this.deleting.set(true);
    this.actionError.set(null);

    this.chatService.remove(message.id).subscribe({
      next: () => {
        this.messages.update((list) => list.filter((item) => item.id !== message.id));
        this.deleting.set(false);
        this.messageToDelete.set(null);
      },
      error: (error: ChatError) => {
        this.deleting.set(false);
        this.messageToDelete.set(null);
        this.actionError.set(error.message);
      },
    });
  }

  /**
   * A URL assinada do anexo expira (24h). Se o arquivo falhar ao carregar, busca a
   * lista de novo para receber URLs novas, no maximo uma vez por minuto.
   */
  protected onAttachmentError(): void {
    const now = Date.now();
    if (now - this.lastAttachmentRefresh < ATTACHMENT_REFRESH_INTERVAL_MS) {
      return;
    }
    this.lastAttachmentRefresh = now;

    this.chatService.messages(this.requestId()).subscribe({
      next: (items) => this.messages.set(items),
    });
  }
}
