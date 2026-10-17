import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatMessage } from '../../../core/chat/chat.model';
import { ChatService } from '../../../core/chat/chat.service';
import {
  CHAT_ATTACHMENT_ACCEPT,
  mergeMessage,
  validateAttachment,
} from '../../../core/chat/chat.utils';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';

type ViewState = 'loading' | 'error' | 'ready';

/** Intervalo minimo entre recargas disparadas por anexo que falhou ao carregar. */
const ATTACHMENT_REFRESH_INTERVAL_MS = 60_000;

@Component({
  selector: 'app-chat-conversation',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, ErrorStateComponent, SkeletonComponent],
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

  protected readonly meId = Number(this.authService.currentUser()?.id);
  protected readonly otherId = Number(this.route.snapshot.paramMap.get('usuarioId'));

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly draft = signal('');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly sending = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly connected = this.chatService.connected;
  protected readonly accept = CHAT_ATTACHMENT_ACCEPT;
  protected readonly canSend = computed(() => !!this.draft().trim() || !!this.selectedFile());
  protected readonly backPath = computed(() =>
    this.authService.role() === 'professional' ? '/professional/mensagens' : '/patient/mensagens',
  );

  constructor() {
    this.load();

    this.chatService.connect();
    this.destroyRef.onDestroy(() => this.chatService.disconnect());

    this.chatService.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'message') {
        if (event.message.senderId === this.otherId) {
          this.messages.update((list) => mergeMessage(list, event.message));
        }
      } else {
        this.messages.update((list) => list.filter((item) => item.id !== event.id));
      }
    });

    effect(() => {
      this.messages();
      setTimeout(() => this.scrollToBottom());
    });
  }

  protected load(): void {
    this.viewState.set('loading');

    this.chatService.list().subscribe({
      next: (items) => {
        this.messages.set(this.fromThisConversation(items));
        this.viewState.set('ready');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected scrollToBottom(): void {
    const el = this.listRef()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
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

    this.chatService.send(this.otherId, content, file).subscribe({
      next: (message) => {
        this.messages.update((list) => mergeMessage(list, message));
        this.draft.set('');
        this.selectedFile.set(null);
        this.sending.set(false);
      },
      error: (error: Error) => {
        this.actionError.set(error.message);
        this.sending.set(false);
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

  protected remove(message: ChatMessage): void {
    if (!confirm('Apagar esta mensagem?')) {
      return;
    }

    this.actionError.set(null);

    this.chatService.remove(message.id).subscribe({
      next: () => this.messages.update((list) => list.filter((item) => item.id !== message.id)),
      error: (error: Error) => this.actionError.set(error.message),
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

    this.chatService.list().subscribe({
      next: (items) => this.messages.set(this.fromThisConversation(items)),
    });
  }

  private fromThisConversation(items: ChatMessage[]): ChatMessage[] {
    return items.filter((m) => m.senderId === this.otherId || m.recipientId === this.otherId);
  }
}
