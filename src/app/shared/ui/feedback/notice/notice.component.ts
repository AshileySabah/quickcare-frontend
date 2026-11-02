import { Component } from '@angular/core';

/** Aviso em destaque dentro de um card ou formulário (ex.: a proposta aguarda novo aceite). */
@Component({
  selector: 'ui-notice',
  standalone: true,
  template: '<ng-content></ng-content>',
  styleUrl: './notice.component.scss',
  host: { role: 'status' },
})
export class NoticeComponent {}
