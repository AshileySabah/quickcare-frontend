import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export const HIGHLIGHT_PARAM = 'destaque';

export interface HighlightTarget {
  key: string;
  nonce: number;
}

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
