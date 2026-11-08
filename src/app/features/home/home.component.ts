import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/layout/card/card.component';
import { AppHeaderComponent } from '../../shared/ui/layout/app-header/app-header.component';
import { PUBLIC_NAV_ITEMS } from '../../shared/ui/layout/app-header/public-nav';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ButtonComponent, CardComponent, AppHeaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly publicNav = PUBLIC_NAV_ITEMS;
}
