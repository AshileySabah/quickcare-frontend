import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [AuthLayoutComponent, ButtonComponent],
  templateUrl: './access-denied.component.html',
})
export class AccessDeniedComponent {
  private readonly router = inject(Router);

  protected goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
