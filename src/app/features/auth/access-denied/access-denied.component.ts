import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.scss',
})
export class AccessDeniedComponent {
  private readonly router = inject(Router);

  protected goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
