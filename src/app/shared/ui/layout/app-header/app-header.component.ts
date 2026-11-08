import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { homeRouteFor } from '../../../../core/auth/home-route';
import { ButtonComponent } from '../../button/button.component';
import { NotificationBellComponent } from '../../notification-bell/notification-bell.component';
import { ProfileSwitcherComponent } from '../../profile-switcher/profile-switcher.component';
import { UserMenuComponent } from '../../user-menu/user-menu.component';

export interface ShellNavItem {
  label: string;
  link: string;
  exact?: boolean;
  count?: number;
}

@Component({
  selector: 'ui-app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ButtonComponent, NotificationBellComponent, ProfileSwitcherComponent, UserMenuComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  private readonly authService = inject(AuthService);

  variant = input<'user' | 'guest'>('user');
  homeLink = input.required<string>();
  brandLabel = input('QuickCare');
  navLabel = input.required<string>();
  navItems = input.required<ShellNavItem[]>();
  navAlign = input<'center' | 'end'>('center');
  profileLink = input<string | null>(null);
  blockedUsersLink = input<string | null>(null);
  documentsLink = input<string | null>(null);

  protected readonly accountLink = computed(() => {
    const user = this.authService.currentUser();
    return user ? homeRouteFor(user) : null;
  });

  constructor() {
    this.authService.ensureSession().subscribe();
  }
}
