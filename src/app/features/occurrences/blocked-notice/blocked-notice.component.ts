import { Component, OnInit, Signal, inject, input, signal } from '@angular/core';
import { SwitchableRole } from '../../../core/models';
import { CreationLock, CreationLockService } from '../../../core/services/creation-lock.service';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { creationLockMessage } from '../block-text';

@Component({
  selector: 'app-blocked-notice',
  standalone: true,
  imports: [NoticeComponent],
  template: `
    @if (lock(); as current) {
      @if (!revalidationOnly() || current.reason === 'revalidation') {
        <ui-notice>{{ message(current) }}</ui-notice>
      }
    }
  `,
})
export class BlockedNoticeComponent implements OnInit {
  private readonly creationLockService = inject(CreationLockService);

  role = input.required<SwitchableRole>();
  revalidationOnly = input(false);

  protected lock: Signal<CreationLock | null> = signal(null);

  ngOnInit(): void {
    this.lock = this.creationLockService.lockFor(this.role());
  }

  protected message(lock: CreationLock): string {
    return creationLockMessage(this.role(), lock);
  }
}
