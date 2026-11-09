import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from '../../../shared/ui/layout/app-header/app-header.component';
import { PUBLIC_NAV_ITEMS } from '../../../shared/ui/layout/app-header/public-nav';

@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent],
  templateUrl: './public-shell.component.html',
  styleUrl: './public-shell.component.scss',
})
export class PublicShellComponent {
  protected readonly publicNav = PUBLIC_NAV_ITEMS;
}
