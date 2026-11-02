import { Directive, ElementRef, HostListener, inject, input, output } from '@angular/core';

/**
 * Para painéis que abrem por cima da tela (menus do header): avisa quando
 * clicam fora do elemento ou apertam Esc, enquanto `uiDismissibleOpen` for true.
 */
@Directive({
  selector: '[uiDismissible]',
  standalone: true,
})
export class DismissibleDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  uiDismissibleOpen = input(false);

  readonly dismissed = output<void>();

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.uiDismissibleOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.dismissed.emit();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.uiDismissibleOpen()) {
      this.dismissed.emit();
    }
  }
}
