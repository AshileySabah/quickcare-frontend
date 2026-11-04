import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SubNavComponent, SubNavItem } from '../../../shared/ui/layout/sub-nav/sub-nav.component';

@Component({
  selector: 'app-admin-general',
  standalone: true,
  imports: [RouterOutlet, SubNavComponent],
  template: `
    <ui-sub-nav label="Ações gerais" [items]="items"></ui-sub-nav>
    <router-outlet></router-outlet>
  `,
})
export class AdminGeneralComponent {
  protected readonly items: SubNavItem[] = [
    { label: 'Usuários', link: '/admin/gerais/usuarios' },
    { label: 'Solicitações', link: '/admin/gerais/solicitacoes' },
    { label: 'Propostas', link: '/admin/gerais/propostas' },
    { label: 'Bloqueios entre usuários', link: '/admin/gerais/bloqueios-entre-usuarios' },
  ];
}
