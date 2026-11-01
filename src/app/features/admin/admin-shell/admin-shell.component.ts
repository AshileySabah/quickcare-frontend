import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent, ShellNavItem } from '../../../shared/ui/layout/app-shell/app-shell.component';

/** O admin não tem tela de perfil: o menu da conta mostra só "Sair". */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
    <ui-app-shell homeLink="/admin" brandLabel="QuickCare Admin" navLabel="Navegação do admin" [navItems]="navItems">
      <router-outlet></router-outlet>
    </ui-app-shell>
  `,
})
export class AdminShellComponent {
  protected readonly navItems: ShellNavItem[] = [
    { label: 'Profissionais', link: '/admin/profissionais' },
    { label: 'Pacientes', link: '/admin/pacientes' },
  ];
}
