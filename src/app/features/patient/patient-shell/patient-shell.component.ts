import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent, ShellNavItem } from '../../../shared/ui/layout/app-shell/app-shell.component';

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
    <ui-app-shell homeLink="/patient" navLabel="Navegação do paciente" [navItems]="navItems" profileLink="/patient/perfil" documentsLink="/patient/documentos" blockedUsersLink="/patient/bloqueados">
      <router-outlet></router-outlet>
    </ui-app-shell>
  `,
})
export class PatientShellComponent {
  protected readonly navItems: ShellNavItem[] = [
    { label: 'Minhas solicitações', link: '/patient', exact: true },
    { label: 'Histórico', link: '/patient/historico' },
    { label: 'Encontrar profissionais', link: '/patient/profissionais', exact: true },
  ];
}
