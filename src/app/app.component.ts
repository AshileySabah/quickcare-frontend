import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HighlightService } from './core/services/highlight.service';
import { ToastContainerComponent } from './shared/ui/feedback/toast/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  /** Criado já na primeira navegação, para ler o `?destaque=` de links abertos de fora (e-mail). */
  private readonly highlightService = inject(HighlightService);
}
