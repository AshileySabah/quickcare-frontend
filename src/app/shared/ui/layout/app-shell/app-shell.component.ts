import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
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
  private readonly router = inject(Router);

  homeLink = input.required<string>();
  brandLabel = input('QuickCare');
  navLabel = input.required<string>();
  navItems = input.required<ShellNavItem[]>();
  profileLink = input<string | null>(null);
  securityLink = input<string | null>(null);
  documentsLink = input<string | null>(null);

  protected readonly fullScreen = signal(false);

  constructor() {
    this.syncFullScreen();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.syncFullScreen());
  }

  private syncFullScreen(): void {
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let fullScreen = false;
    while (route) {
      fullScreen ||= route.data['fullScreen'] === true;
      route = route.firstChild;
    }
    this.fullScreen.set(fullScreen);
  }
}
