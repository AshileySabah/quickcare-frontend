import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Professional } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';

@Component({
  selector: 'app-awaiting-validation',
  standalone: true,
  imports: [ButtonComponent, CardComponent],
  templateUrl: './awaiting-validation.component.html',
  styleUrl: './awaiting-validation.component.scss',
})
export class AwaitingValidationComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly professional = computed(() => this.authService.currentUser() as Professional | null);

  constructor() {
    if (this.professional()?.validationStatus === 'aprovado') {
      this.router.navigateByUrl('/professional');
    }
  }

  protected logout(): void {
    this.authService.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
