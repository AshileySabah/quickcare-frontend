import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [AuthLayoutComponent, RouterLink, ButtonComponent],
  templateUrl: './check-email.component.html',
})
export class CheckEmailComponent {
  protected readonly email = inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '';
}
