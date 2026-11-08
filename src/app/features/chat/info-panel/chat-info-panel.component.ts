import { Component, computed, input, output } from '@angular/core';
import { ChatMessage, Conversation } from '../../../core/chat/chat.model';
import { collectFiles, roleLabel } from '../../../core/chat/chat.utils';
import { ChatAvatarComponent } from '../avatar/chat-avatar.component';

/** Painel lateral com os arquivos trocados e os participantes da conversa. */
@Component({
  selector: 'app-chat-info-panel',
  standalone: true,
  imports: [ChatAvatarComponent],
  templateUrl: './chat-info-panel.component.html',
  styleUrl: './chat-info-panel.component.scss',
})
export class ChatInfoPanelComponent {
  readonly conversation = input.required<Conversation>();
  readonly messages = input.required<ChatMessage[]>();
  readonly meId = input.required<number>();
  readonly closed = output<void>();

  protected readonly files = computed(() => collectFiles(this.messages()));
  protected readonly photos = computed(() => this.files().images.slice(0, 6));
  protected readonly documents = computed(() => this.files().documents.slice(0, 5));
  protected readonly roleLabel = roleLabel;
}
