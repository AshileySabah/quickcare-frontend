import { Component } from '@angular/core';

@Component({
  selector: 'ui-notice',
  standalone: true,
  template: '<ng-content></ng-content>',
  styleUrl: './notice.component.scss',
  host: { role: 'status' },
})
export class NoticeComponent {}
