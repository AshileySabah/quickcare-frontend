import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../feedback/avatar/avatar.component';

@Component({
  selector: 'ui-person-chip',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, AvatarComponent],
  templateUrl: './person-chip.component.html',
  styleUrl: './person-chip.component.scss',
})
export class PersonChipComponent {
  name = input.required<string>();
  avatarUrl = input<string | undefined>(undefined);
  caption = input<string | null>(null);
  link = input<string | unknown[] | null>(null);
}
