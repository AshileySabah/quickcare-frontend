import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { homeRouteFor } from '../../../core/auth/home-route';
import { SwitchableRole } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../feedback/toast/toast.service';

const OPTIONS: { role: SwitchableRole; label: string }[] = [
  { role: 'patient', label: 'Paciente' },
  { role: 'professional', label: 'Profissional' },
];

/**
 * Alterna entre paciente e profissional sem sair da conta. Só aparece para
 * quem tem os dois perfis; o atalho para criar o outro fica no menu do avatar.
 */
@Component({
  selector: 'ui-profile-switcher',
  standalone: true,
  templateUrl: './profile-switcher.component.html',
  styleUrl: './profile-switcher.component.scss',
})
export class ProfileSwitcherComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly notificationService = inject(NotificationService);

  protected readonly options = OPTIONS;
  protected readonly currentRole = this.authService.role;
  protected readonly switching = signal(false);

  /** Não lidas do perfil que não está em uso, mostradas na opção dele. */
  protected readonly otherUnread = this.notificationService.otherUnread;

  protected readonly hasBothProfiles = computed(() => this.authService.profiles().length > 1);

  protected isBanned(role: SwitchableRole): boolean {
    return this.authService.profiles().find((profile) => profile.role === role)?.banned ?? true;
  }

  protected select(role: SwitchableRole): void {
    if (role === this.currentRole() || this.switching() || this.isBanned(role)) {
      return;
    }

    this.switching.set(true);
    this.authService.switchProfile(role).subscribe({
      next: (user) => {
        this.switching.set(false);
        this.router.navigateByUrl(homeRouteFor(user));
      },
      error: (error: Error) => {
        this.switching.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
