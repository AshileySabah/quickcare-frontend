import { Component, OnInit, Signal, inject, input, signal } from '@angular/core';
import { Block, SwitchableRole } from '../../../core/models';
import { OccurrenceService } from '../../../core/services/occurrence.service';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { blockMessage } from '../block-text';

@Component({
  selector: 'app-blocked-notice',
  standalone: true,
  imports: [NoticeComponent],
  template: `
    @if (block(); as current) {
      <ui-notice>{{ message(current) }}</ui-notice>
    }
  `,
})
export class BlockedNoticeComponent implements OnInit {
  private readonly occurrenceService = inject(OccurrenceService);

  role = input.required<SwitchableRole>();

  protected block: Signal<Block | null> = signal(null);

  ngOnInit(): void {
    this.block = this.occurrenceService.blockFor(this.role());
  }

  protected message(block: Block): string {
    return blockMessage(this.role(), block);
  }
}
