import {
  Component,
  OnInit,
  Signal,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SwitchableRole } from '../../../core/models';
import {
  CreationLock,
  CreationLockService,
} from '../../../core/services/creation-lock.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { creationLockMessage } from '../block-text';

@Component({
  selector: 'app-blocked-notice',
  standalone: true,
  imports: [NoticeComponent, ButtonComponent, RouterLink],
  template: `
    @if (lock(); as current) {
      @if (!revalidationOnly() || current.reason === 'revalidation') {
        <ui-notice>
          <div class="blocked-notice">
            <span class="blocked-notice__text">{{ message(current) }}</span>
            @if (current.reason === 'revalidation') {
              <ui-button
                class="blocked-notice__action"
                variant="warning-outline"
                size="sm"
                [routerLink]="documentsLink()"
              >
                Documentos
              </ui-button>
            }
          </div>
        </ui-notice>
      }
    }
  `,
  styles: `
    @use 'tokens' as tokens;

    .blocked-notice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: tokens.space(2);
    }

    .blocked-notice__text {
      flex: 1 1 20rem;
    }

    .blocked-notice__action {
      margin-left: auto;
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

  protected documentsLink(): string {
    return `/${this.role()}/documentos`;
  }

  protected message(lock: CreationLock): string {
    return creationLockMessage(this.role(), lock);
  }
}
