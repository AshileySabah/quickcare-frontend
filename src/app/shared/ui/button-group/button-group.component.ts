import { Component } from '@angular/core';

@Component({
  selector: 'ui-button-group',
  standalone: true,
  template: '<ng-content></ng-content>',
  styleUrl: './button-group.component.scss',
})
export class ButtonGroupComponent {}
