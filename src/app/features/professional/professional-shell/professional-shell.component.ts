import { Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatUnreadService } from '../../../core/chat/chat-unread.service';
import { ChatService } from '../../../core/chat/chat.service';
import {
  AppShellComponent,
  ShellNavItem,
} from '../../../shared/ui/layout/app-shell/app-shell.component';

@Component({
  selector: 'app-professional-shell',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
    <ui-app-shell
      homeLink="/professional"
      navLabel="Navegação do profissional"
      [navItems]="navItems()"
      profileLink="/professional/perfil"
      documentsLink="/professional/documentos"
      securityLink="/professional/seguranca"
    >
      <router-outlet></router-outlet>
    </ui-app-shell>
  `,
})
export class ProfessionalShellComponent {
  private readonly chatService = inject(ChatService);
  private readonly chatUnread = inject(ChatUnreadService);

  protected readonly navItems = computed<ShellNavItem[]>(() => [
    { label: 'Solicitações abertas', link: '/professional', exact: true },
    { label: 'Minhas propostas', link: '/professional/propostas' },
    { label: 'Histórico', link: '/professional/historico' },
    { label: 'Mensagens', link: '/professional/mensagens', count: this.chatUnread.total(), countLabel: 'mensagens não lidas' },
  ]);

  constructor() {
    this.chatService.connect();
    inject(DestroyRef).onDestroy(() => this.chatService.disconnect());
  }
}
