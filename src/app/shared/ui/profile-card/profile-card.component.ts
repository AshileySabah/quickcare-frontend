import { Component, input } from '@angular/core';
import { AvatarComponent } from '../feedback/avatar/avatar.component';
import { CardComponent } from '../layout/card/card.component';

export interface ProfileDetail {
  label: string;
  value: string;
}

@Component({
  selector: 'ui-profile-card',
  standalone: true,
  imports: [AvatarComponent, CardComponent],
  templateUrl: './profile-card.component.html',
  styleUrl: './profile-card.component.scss',
})
export class ProfileCardComponent {
  name = input.required<string>();
  avatarUrl = input<string | undefined>(undefined);
  subtitle = input('');
  details = input<ProfileDetail[]>([]);
}
