import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/** Parâmetro de URL que indica o item a destacar, ex.: `?destaque=proposta-12`. */
export const HIGHLIGHT_PARAM = 'destaque';

export interface HighlightTarget {
  key: string;
  /** Muda a cada pedido, para destacar de novo o mesmo item. */
  nonce: number;
}

/**
 * Qual item da tela destacar (ao abrir uma notificação, pelo sino ou pelo
 * link do e-mail). Lê o `?destaque=` a cada navegação; o `uiHighlight` do
 * item consome o pedido quando ele aparece na tela.
 */
@Injectable({ providedIn: 'root' })
export class HighlightService {
  private readonly router = inject(Router);
  private readonly targetSignal = signal<HighlightTarget | null>(null);
  private nonce = 0;

  readonly target = this.targetSignal.asReadonly();

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      const key = this.router.parseUrl(this.router.url).queryParamMap.get(HIGHLIGHT_PARAM);
      if (key) {
        this.request(key);
      } else {
        this.targetSignal.set(null);
      }
    });
  }

  request(key: string): void {
    this.targetSignal.set({ key, nonce: ++this.nonce });
  }

  consume(target: HighlightTarget): void {
    if (this.targetSignal()?.nonce === target.nonce) {
      this.targetSignal.set(null);
    }
  }

  /**
   * Abre o link: navega ou, se já está na mesma tela (o roteador ignora a
   * navegação), só pede o destaque de novo.
   */
  open(link: string): void {
    const key = this.router.parseUrl(link).queryParamMap.get(HIGHLIGHT_PARAM);
    if (this.router.url === link) {
      if (key) {
        this.request(key);
      }
      return;
    }
    this.router.navigateByUrl(link);
  }
}
