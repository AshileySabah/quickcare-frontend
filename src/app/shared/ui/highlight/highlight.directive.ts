import { DestroyRef, Directive, ElementRef, effect, inject, input, untracked } from '@angular/core';
import { HighlightService } from '../../../core/services/highlight.service';

const HIGHLIGHT_CLASS = 'ui-highlight--active';
const HIGHLIGHT_DURATION_MS = 3600;

/**
 * Marca um item que pode ser alvo de uma notificação (`uiHighlight="proposta-12"`).
 * Quando pedem para destacá-lo, rola até ele e faz o contorno verde pulsar.
 * Funciona também se o item só aparece depois (lista carregada da API).
 */
@Directive({
  selector: '[uiHighlight]',
  standalone: true,
  host: { class: 'ui-highlight' },
})
export class HighlightDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly highlightService = inject(HighlightService);
  private timer?: ReturnType<typeof setTimeout>;

  uiHighlight = input.required<string>();

  constructor() {
    effect(() => {
      const target = this.highlightService.target();
      if (!target || target.key !== this.uiHighlight()) {
        return;
      }
      untracked(() => {
        this.highlightService.consume(target);
        // Espera o layout assentar (a lista acabou de renderizar).
        setTimeout(() => this.flash());
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  private flash(): void {
    this.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Reinicia a animação se o mesmo item for destacado de novo.
    this.element.classList.remove(HIGHLIGHT_CLASS);
    void this.element.offsetWidth;
    this.element.classList.add(HIGHLIGHT_CLASS);

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.element.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_DURATION_MS);
  }
}
