import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent, ShellNavItem } from '../../../shared/ui/layout/app-shell/app-shell.component';

@Component({
  selector: 'app-professional-shell',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
    <ui-app-shell
      homeLink="/professional"
      navLabel="Navegação do profissional"
      [navItems]="navItems"
      profileLink="/professional/perfil"
    >
      <router-outlet></router-outlet>
    </ui-app-shell>
  `,
})
export class ProfessionalShellComponent {
  protected readonly navItems: ShellNavItem[] = [
    { label: 'Solicitações abertas', link: '/professional', exact: true },
    { label: 'Minhas propostas', link: '/professional/propostas' },
    { label: 'Histórico', link: '/professional/historico' },
  ];
}
