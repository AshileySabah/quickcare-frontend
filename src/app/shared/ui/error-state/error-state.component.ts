import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'ui-error-state',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  message = input('Não foi possível carregar os dados. Tente novamente.');

  retry = output<void>();
}
