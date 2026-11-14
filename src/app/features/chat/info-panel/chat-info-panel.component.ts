import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatMessage, ChatParticipant, Conversation } from '../../../core/chat/chat.model';
import { collectFiles, profileLink, roleLabel } from '../../../core/chat/chat.utils';
import { ChatAvatarComponent } from '../avatar/chat-avatar.component';

@Component({
  selector: 'app-chat-info-panel',
  standalone: true,
  imports: [ChatAvatarComponent, RouterLink],
  templateUrl: './chat-info-panel.component.html',
  styleUrl: './chat-info-panel.component.scss',
})
export class ChatInfoPanelComponent {
  readonly conversation = input.required<Conversation>();
  readonly messages = input.required<ChatMessage[]>();
  readonly meId = input.required<number>();
  readonly viewerRole = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly files = computed(() => collectFiles(this.messages()));
  protected readonly photos = computed(() => this.files().images.slice(0, 6));
  protected readonly documents = computed(() => this.files().documents.slice(0, 5));
  protected readonly roleLabel = roleLabel;

  protected linkOf(person: ChatParticipant): (string | number)[] | null {
    return profileLink(person, this.viewerRole(), this.meId());
  }
}
