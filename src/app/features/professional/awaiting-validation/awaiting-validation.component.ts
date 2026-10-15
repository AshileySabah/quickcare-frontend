import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { MyValidationComponent } from '../../validation/my-validation/my-validation.component';

/** Profissional sem cadastro aprovado: acompanha as etapas e reenvia as reprovadas. */
@Component({
  selector: 'app-awaiting-validation',
  standalone: true,
  imports: [ButtonComponent, MyValidationComponent],
  templateUrl: './awaiting-validation.component.html',
  styleUrl: './awaiting-validation.component.scss',
})
export class AwaitingValidationComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly userName = computed(() => this.authService.currentUser()?.name ?? '');

  protected readonly isApproved = computed(() => {
    const user = this.authService.currentUser();
    return user?.role === 'professional' && user.validationStatus === 'aprovado';
  });

  constructor() {
    if (this.isApproved()) {
      this.router.navigateByUrl('/professional');
    }
  }

  protected logout(): void {
    this.authService.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
