import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-avatar',
  standalone: true,
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  name = input.required<string>();
  imageUrl = input<string | undefined>(undefined);

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  });
}
