import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { homeRouteFor } from '../../../core/auth/home-route';
import { SwitchableRole } from '../../../core/models';
import { ToastService } from '../feedback/toast/toast.service';

const OPTIONS: { role: SwitchableRole; label: string }[] = [
  { role: 'patient', label: 'Paciente' },
  { role: 'professional', label: 'Profissional' },
];

/**
 * Alterna entre paciente e profissional sem sair da conta. Quem só tem um
 * perfil vê o atalho para criar o outro; o admin não vê nada.
 */
@Component({
  selector: 'ui-profile-switcher',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile-switcher.component.html',
  styleUrl: './profile-switcher.component.scss',
})
export class ProfileSwitcherComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly options = OPTIONS;
  protected readonly currentRole = this.authService.role;
  protected readonly switching = signal(false);

  protected readonly hasBothProfiles = computed(() => this.authService.profiles().length > 1);

  /** O perfil que a conta ainda não tem, para oferecer a criação. */
  protected readonly missingRole = computed<SwitchableRole | null>(() => {
    const role = this.currentRole();
    if ((role !== 'patient' && role !== 'professional') || this.hasBothProfiles()) {
      return null;
    }
    return role === 'patient' ? 'professional' : 'patient';
  });

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
