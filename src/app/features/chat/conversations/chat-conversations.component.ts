import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatMessage } from '../../../core/chat/chat.model';
import { ChatService } from '../../../core/chat/chat.service';
import {
  buildConversations,
  mergeMessage,
} from '../../../core/chat/chat.utils';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';

@Component({
  selector: 'app-chat-conversations',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './chat-conversations.component.html',
  styleUrl: './chat-conversations.component.scss',
})
export class ChatConversationsComponent {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  private readonly currentUserId = Number(this.authService.currentUser()?.id);
  private readonly messages = signal<ChatMessage[]>([]);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly conversations = computed(() =>
    buildConversations(this.messages(), this.currentUserId),
  );
  protected readonly basePath = computed(() =>
    this.authService.role() === 'professional'
      ? '/professional/mensagens'
      : '/patient/mensagens',
  );

  constructor() {
    this.load();

    this.chatService.connect();
    this.destroyRef.onDestroy(() => this.chatService.disconnect());

    this.chatService.events$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'message') {
        this.messages.update((list) => mergeMessage(list, event.message));
      } else {
        this.messages.update((list) =>
          list.filter((item) => item.id !== event.id),
        );
      }
      this.viewState.set(this.messages().length === 0 ? 'empty' : 'filled');
    });
  }

  protected load(): void {
    this.viewState.set('loading');

    this.chatService.list().subscribe({
      next: (items) => {
        this.messages.set(items);
        this.viewState.set(items.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected open(value: string): void {
    const id = Number(value);
    if (id > 0) {
      this.router.navigate([this.basePath(), id]);
    }
  }
}
