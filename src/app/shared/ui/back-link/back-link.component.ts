import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

/**
 * "← Voltar" no topo das telas internas (detalhe, edição, perfil). Volta para
 * a tela anterior; aberta direto pelo link, sem histórico no app, vai para o
 * `fallback`.
 */
@Component({
  selector: 'ui-back-link',
  standalone: true,
  template: `<button type="button" class="back-link" (click)="back()">← {{ label() }}</button>`,
  styleUrl: './back-link.component.scss',
})
export class BackLinkComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  fallback = input.required<string>();
  label = input('Voltar');

  protected back(): void {
    if (this.router.lastSuccessfulNavigation?.previousNavigation) {
      this.location.back();
    } else {
      this.router.navigateByUrl(this.fallback());
    }
  }
}
