import { Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatUnreadService } from '../../../core/chat/chat-unread.service';
import { ChatService } from '../../../core/chat/chat.service';
import { AppShellComponent, ShellNavItem } from '../../../shared/ui/layout/app-shell/app-shell.component';

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
    <ui-app-shell homeLink="/patient" navLabel="Navegação do paciente" [navItems]="navItems()" profileLink="/patient/perfil" documentsLink="/patient/documentos" securityLink="/patient/seguranca">
      <router-outlet></router-outlet>
    </ui-app-shell>
  `,
})
export class PatientShellComponent {
  private readonly chatService = inject(ChatService);
  private readonly chatUnread = inject(ChatUnreadService);

  protected readonly navItems = computed<ShellNavItem[]>(() => [
    { label: 'Minhas solicitações', link: '/patient', exact: true },
    { label: 'Histórico', link: '/patient/historico' },
    { label: 'Encontrar profissionais', link: '/patient/profissionais', exact: true },
    { label: 'Mensagens', link: '/patient/mensagens', count: this.chatUnread.total(), countLabel: 'mensagens não lidas' },
  ]);

  constructor() {
    this.chatService.connect();
    inject(DestroyRef).onDestroy(() => this.chatService.disconnect());
  }
}
