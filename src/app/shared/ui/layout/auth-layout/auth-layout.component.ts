import { Component, ViewEncapsulation, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * - `card`: cartão estreito e centralizado (login, senha);
 * - `wide`: cartão mais largo (escolha do tipo de cadastro);
 * - `form`: sem cartão, largo e alinhado ao topo (formulários de cadastro).
 */
export type AuthPanel = 'card' | 'wide' | 'form';

/**
 * Página pública de entrada (login, senha, cadastro): painel lateral com a
 * marca e um texto de apoio, e o conteúdo da tela projetado ao lado. Sem
 * `sideTitle`, fica só o conteúdo centralizado (ex.: acesso negado).
 *
 * Sem encapsulamento, mas tudo sob `.auth-layout`, para que título,
 * subtítulo, rodapé e link de voltar projetados pela tela usem as classes
 * `auth-layout__title`, `__subtitle`, `__footer` e `__back`.
 */
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
