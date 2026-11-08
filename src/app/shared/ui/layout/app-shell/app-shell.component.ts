import { Component, input } from '@angular/core';
import { AppHeaderComponent, ShellNavItem } from '../app-header/app-header.component';

export type { ShellNavItem } from '../app-header/app-header.component';

@Component({
  selector: 'ui-app-shell',
  standalone: true,
  imports: [AppHeaderComponent],
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
  documentsLink = input<string | null>(null);
}
