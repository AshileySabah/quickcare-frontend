import { DestroyRef, Directive, ElementRef, effect, inject, input, untracked } from '@angular/core';
import { HighlightService } from '../../../core/services/highlight.service';

const HIGHLIGHT_CLASS = 'ui-highlight--active';
const HIGHLIGHT_DURATION_MS = 3600;

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
        setTimeout(() => this.flash());
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  private flash(): void {
    this.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    this.element.classList.remove(HIGHLIGHT_CLASS);
    void this.element.offsetWidth;
    this.element.classList.add(HIGHLIGHT_CLASS);

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.element.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_DURATION_MS);
  }
}
