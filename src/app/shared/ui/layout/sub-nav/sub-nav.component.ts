import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SubNavItem {
  label: string;
  link: string;
}

@Component({
  selector: 'ui-sub-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="ui-sub-nav" [attr.aria-label]="label()">
      @for (item of items(); track item.link) {
        <a
          class="ui-sub-nav__item"
          [routerLink]="item.link"
          routerLinkActive="ui-sub-nav__item--active"
          ariaCurrentWhenActive="page"
        >
          {{ item.label }}
        </a>
      }
    </nav>
  `,
  styleUrl: './sub-nav.component.scss',
})
export class SubNavComponent {
  items = input.required<SubNavItem[]>();
  label = input.required<string>();
}
