import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SwitchableRole } from '../../../core/models';
import { DismissibleDirective } from '../dismissible/dismissible.directive';
import { AvatarComponent } from '../feedback/avatar/avatar.component';

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

  profileLink = input<string | null>(null);
  blockedUsersLink = input<string | null>(null);
  documentsLink = input<string | null>(null);

  protected readonly open = signal(false);

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
