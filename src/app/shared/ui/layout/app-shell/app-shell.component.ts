import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  selector: 'ui-app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NotificationBellComponent, ProfileSwitcherComponent, UserMenuComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  homeLink = input.required<string>();
  brandLabel = input('QuickCare');
  navLabel = input.required<string>();
  navItems = input.required<ShellNavItem[]>();
  profileLink = input<string | null>(null);
  blockedUsersLink = input<string | null>(null);
}
