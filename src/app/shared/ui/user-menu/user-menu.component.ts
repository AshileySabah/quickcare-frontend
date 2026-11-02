import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SwitchableRole } from '../../../core/models';
import { DismissibleDirective } from '../dismissible/dismissible.directive';
import { AvatarComponent } from '../feedback/avatar/avatar.component';

/**
 * Avatar do header que abre o menu da conta: "Meu perfil" e "Usuários
 * bloqueados" (se houver), "Sair" e, para quem só tem um perfil, o atalho para
 * criar o outro.
 */
@Component({
  selector: 'ui-user-menu',
  standalone: true,
  imports: [RouterLink, AvatarComponent, DismissibleDirective],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Tela de edição do perfil em uso; sem ela (admin), o menu só tem "Sair". */
  profileLink = input<string | null>(null);
  /** Quem o perfil em uso bloqueou; o admin não bloqueia ninguém. */
  blockedUsersLink = input<string | null>(null);

  protected readonly open = signal(false);

  /** O perfil que a conta ainda não tem; o admin nunca cria outro. */
  protected readonly missingRole = computed<SwitchableRole | null>(() => {
    const role = this.authService.role();
    if ((role !== 'patient' && role !== 'professional') || this.authService.profiles().length > 1) {
      return null;
    }
    return role === 'patient' ? 'professional' : 'patient';
  });

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected logout(): void {
    this.close();
    this.authService.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
