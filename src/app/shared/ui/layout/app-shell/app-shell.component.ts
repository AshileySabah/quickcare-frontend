import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ProfileSwitcherComponent } from '../../profile-switcher/profile-switcher.component';
import { UserMenuComponent } from '../../user-menu/user-menu.component';

export interface ShellNavItem {
  label: string;
  link: string;
  /** Marca como ativo só na rota exata (para a tela inicial, que é prefixo das outras). */
  exact?: boolean;
}

/**
 * Layout das áreas logadas (paciente, profissional e admin): header com marca,
 * navegação, seletor de perfil e menu da conta. Cada perfil tem o próprio
 * shell, que só informa os itens e projeta o conteúdo aqui dentro.
 */
@Component({
  selector: 'ui-app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ProfileSwitcherComponent, UserMenuComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  homeLink = input.required<string>();
  brandLabel = input('QuickCare');
  navLabel = input.required<string>();
  navItems = input.required<ShellNavItem[]>();
  /** Tela de edição do perfil em uso; nula para quem não tem (admin). */
  profileLink = input<string | null>(null);
}
