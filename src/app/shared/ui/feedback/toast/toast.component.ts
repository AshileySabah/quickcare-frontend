import { Component, input, output } from '@angular/core';
import { ToastVariant } from './toast.service';

@Component({
  selector: 'ui-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  message = input.required<string>();
  variant = input<ToastVariant>('info');

  dismissed = output<void>();
}
