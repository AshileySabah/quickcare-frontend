import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HighlightService } from './core/services/highlight.service';
import { SessionExpiredDialogComponent } from './features/auth/session-expired-dialog/session-expired-dialog.component';
import { ToastContainerComponent } from './shared/ui/feedback/toast/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, SessionExpiredDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly highlightService = inject(HighlightService);
}
