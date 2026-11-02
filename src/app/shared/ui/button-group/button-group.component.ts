import { Component } from '@angular/core';

/** Botões lado a lado, com espaço entre eles e quebra de linha em telas estreitas. */
@Component({
  selector: 'ui-button-group',
  standalone: true,
  template: '<ng-content></ng-content>',
  styleUrl: './button-group.component.scss',
})
export class ButtonGroupComponent {}
