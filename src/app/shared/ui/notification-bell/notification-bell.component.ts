import { Component, computed, inject, signal } from '@angular/core';
import { timeAgo } from '../../../core/formatting/time-ago';
import { AppNotification } from '../../../core/models';
import { HighlightService } from '../../../core/services/highlight.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DismissibleDirective } from '../dismissible/dismissible.directive';
import { ToastService } from '../feedback/toast/toast.service';
import { IconComponent } from '../icon/icon.component';

const MAX_BADGE = 99;

/**
 * Sino do header: não lidas do perfil em uso e, ao abrir, a lista delas.
 * Abrir uma notificação marca como lida, leva para onde ela aponta e
 * destaca o item de que ela trata.
 */
@Component({
  selector: 'ui-notification-bell',
  standalone: true,
  imports: [IconComponent, DismissibleDirective],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  protected readonly notificationService = inject(NotificationService);
  private readonly highlightService = inject(HighlightService);
  private readonly toastService = inject(ToastService);

  protected readonly open = signal(false);
  protected readonly timeAgo = timeAgo;

  protected readonly badge = computed(() => {
    const count = this.notificationService.activeUnread();
    return count > MAX_BADGE ? `${MAX_BADGE}+` : String(count);
  });

  protected readonly triggerLabel = computed(() => {
    const count = this.notificationService.activeUnread();
    if (count === 0) return 'Notificações';
    return count === 1 ? 'Notificações: 1 não lida' : `Notificações: ${count} não lidas`;
  });

  protected toggle(): void {
    const opening = !this.open();
    this.open.set(opening);
    if (opening) {
      this.notificationService.reload();
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  protected select(notification: AppNotification): void {
    this.close();
    this.notificationService.markAsRead(notification).subscribe({
      error: (error: Error) => this.toastService.error(error.message),
    });
    if (notification.link) {
      this.highlightService.open(notification.link);
    }
  }

  protected markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      error: (error: Error) => this.toastService.error(error.message),
    });
  }
}
