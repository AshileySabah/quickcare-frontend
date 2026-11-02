import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { combineLatest, filter, startWith, switchMap } from 'rxjs';
import { AdminDisputeService } from '../../../core/services/admin/admin-dispute.service';
import { AdminProfileService } from '../../../core/services/admin/admin-profile.service';
import { AppShellComponent, ShellNavItem } from '../../../shared/ui/layout/app-shell/app-shell.component';

/**
 * O admin não tem tela de perfil: o menu da conta mostra só "Sair". O menu
 * separa o que chega por demanda (Validação, Disputas, Ocorrências, com a
 * contagem do que aguarda decisão, atualizada a cada navegação) do que o
 * admin faz por iniciativa própria (Gerais).
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
    <ui-app-shell homeLink="/admin" brandLabel="QuickCare Admin" navLabel="Navegação do admin" [navItems]="navItems()">
      <router-outlet></router-outlet>
    </ui-app-shell>
  `,
})
export class AdminShellComponent {
  private readonly openDisputes = signal(0);
  private readonly openAppeals = signal(0);

  protected readonly navItems = computed<ShellNavItem[]>(() => [
    { label: 'Validação', link: '/admin/validacao' },
    { label: 'Disputas', link: '/admin/disputas', count: this.openDisputes() },
    { label: 'Ocorrências', link: '/admin/ocorrencias', count: this.openAppeals() },
    { label: 'Gerais', link: '/admin/gerais' },
  ]);

  constructor() {
    const disputeService = inject(AdminDisputeService);
    const profileService = inject(AdminProfileService);
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        switchMap(() => combineLatest([disputeService.countOpen(), profileService.countOpenAppeals()])),
        takeUntilDestroyed(),
      )
      .subscribe(([disputes, appeals]) => {
        this.openDisputes.set(disputes);
        this.openAppeals.set(appeals);
      });
  }
}
