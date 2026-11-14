import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatAttachment, ChatFileFilter, ChatMessage, ChatParticipant, Conversation } from '../../../core/chat/chat.model';
import { collectFiles, profileLink, roleLabel } from '../../../core/chat/chat.utils';
import { createPagination } from '../../../core/lists/pagination';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';
import { ChatAvatarComponent } from '../avatar/chat-avatar.component';

interface FileFilterOption {
  key: ChatFileFilter;
  label: string;
}

@Component({
  selector: 'app-chat-info-panel',
  standalone: true,
  imports: [ChatAvatarComponent, PaginatorComponent, RouterLink],
  templateUrl: './chat-info-panel.component.html',
  styleUrl: './chat-info-panel.component.scss',
})
export class ChatInfoPanelComponent {
  readonly conversation = input.required<Conversation>();
  readonly messages = input.required<ChatMessage[]>();
  readonly meId = input.required<number>();
  readonly viewerRole = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly filterOptions: FileFilterOption[] = [
    { key: 'images', label: 'Fotos' },
    { key: 'videos', label: 'Vídeos' },
    { key: 'audios', label: 'Áudios' },
    { key: 'documents', label: 'Documentos' },
  ];

  protected readonly files = computed(() => collectFiles(this.messages()));
  protected readonly photos = computed(() => this.files().images.slice(0, 6));
  protected readonly activeFilter = signal<ChatFileFilter | null>(null);
  protected readonly activeLabel = computed(
    () => this.filterOptions.find((option) => option.key === this.activeFilter())?.label ?? '',
  );
  protected readonly filteredFiles = computed<ChatAttachment[]>(() => {
    const filter = this.activeFilter();
    return filter ? this.files()[filter] : [];
  });
  protected readonly pager = createPagination(this.filteredFiles);
  protected readonly roleLabel = roleLabel;

  protected toggleFilter(filter: ChatFileFilter): void {
    this.activeFilter.update((current) => (current === filter ? null : filter));
  }

  protected linkOf(person: ChatParticipant): (string | number)[] | null {
    return profileLink(person, this.viewerRole(), this.meId());
  }
}
