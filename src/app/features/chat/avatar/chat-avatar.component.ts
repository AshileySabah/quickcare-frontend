import { Component, computed, input, signal } from '@angular/core';
import { colorFor, initials } from '../../../core/chat/chat.utils';

/** Foto do usuario ou, sem foto, as iniciais numa cor estavel; com groupCount mostra o total do grupo. */
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
    :host {
      display: inline-grid;
      place-items: center;
      flex: none;
      overflow: hidden;
      border-radius: 50%;
      font-weight: 500;
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
    '[style.background]': 'background()',
    '[style.color]': 'foreground()',
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
  protected readonly background = computed(() => (this.groupCount() !== null ? '#0b5a46' : colorFor(this.userId()).bg));
  protected readonly foreground = computed(() => (this.groupCount() !== null ? '#fff' : colorFor(this.userId()).fg));
}
