import { Component, computed, input } from '@angular/core';
import { CardComponent } from '../../layout/card/card.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';

/**
 * Esqueleto de carregamento nos formatos que as telas usam:
 * - `cards`: lista de cards (listas de solicitações, propostas, cadastros);
 * - `page`: cabeçalho e bloco de conteúdo (telas de detalhe);
 * - `form`: avatar e seções de formulário (edição de perfil).
 */
@Component({
  selector: 'ui-skeleton-list',
  standalone: true,
  imports: [CardComponent, SkeletonComponent],
  templateUrl: './skeleton-list.component.html',
  styleUrl: './skeleton-list.component.scss',
})
export class SkeletonListComponent {
  variant = input<'cards' | 'page' | 'form'>('cards');
  /** Quantos cards na variante `cards`. */
  count = input(3);

  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
