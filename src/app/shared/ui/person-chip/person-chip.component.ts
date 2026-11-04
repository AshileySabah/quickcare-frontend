import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../feedback/avatar/avatar.component';

export const UNAVAILABLE_PROFILE_LABEL = 'Perfil não disponível';

@Component({
  selector: 'ui-person-chip',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, AvatarComponent],
  templateUrl: './person-chip.component.html',
  styleUrl: './person-chip.component.scss',
})
export class PersonChipComponent {
  name = input('');
  avatarUrl = input<string | undefined>(undefined);
  caption = input<string | null>(null);
  link = input<string | unknown[] | null>(null);
  unavailable = input(false);

  protected readonly displayName = computed(() => (this.unavailable() ? UNAVAILABLE_PROFILE_LABEL : this.name()));
  protected readonly target = computed(() => (this.unavailable() ? null : this.link()));
}
