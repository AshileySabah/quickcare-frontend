import { Component, ViewEncapsulation, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type AuthPanel = 'card' | 'wide' | 'form';

@Component({
  selector: 'ui-auth-layout',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AuthLayoutComponent {
  sideTitle = input<string | null>(null);
  sideText = input('');
  sideItems = input<string[]>([]);
  panel = input<AuthPanel>('card');
}
