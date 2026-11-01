import { Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SwitchableRole } from '../../../core/models';
import { AvatarComponent } from '../feedback/avatar/avatar.component';

/**
 * Avatar do header que abre o menu da conta: "Meu perfil" (se houver), "Sair"
 * e, para quem só tem um perfil, o atalho para criar o outro.
 */
@Component({
  selector: 'ui-user-menu',
  standalone: true,
  imports: [RouterLink, AvatarComponent],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Tela de edição do perfil em uso; sem ela (admin), o menu só tem "Sair". */
  profileLink = input<string | null>(null);

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

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
