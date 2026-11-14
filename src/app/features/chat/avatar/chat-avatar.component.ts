import { Component, computed, input, signal } from '@angular/core';
import { initials } from '../../../core/chat/chat.utils';

@Component({
  selector: 'app-chat-avatar',
  standalone: true,
  template: `
    @if (showImage()) {
      <img [src]="url()" [alt]="name()" (error)="failedUrl.set(url())" />
    } @else if (groupCount() !== null) {
      {{ groupCount() }}
    } @else {
      {{ initialsText() }}
    }
  `,
  styles: `
    @use 'tokens' as tokens;

    :host {
      display: inline-grid;
      place-items: center;
      flex: none;
      overflow: hidden;
      border-radius: 50%;
      font-weight: tokens.font-weight('medium');
      background-color: tokens.color('teal', 100);
      color: tokens.color('teal', 700);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.38',
  },
})
export class ChatAvatarComponent {
  readonly name = input('');
  readonly url = input<string | null>(null);
  readonly userId = input(0);
  readonly size = input(40);
  readonly groupCount = input<number | null>(null);

  protected readonly failedUrl = signal<string | null>(null);
  protected readonly showImage = computed(() => !!this.url() && this.failedUrl() !== this.url());
  protected readonly initialsText = computed(() => initials(this.name()));
}
