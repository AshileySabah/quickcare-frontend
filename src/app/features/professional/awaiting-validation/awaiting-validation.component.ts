import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AppShellComponent } from '../../../shared/ui/layout/app-shell/app-shell.component';
import { MyValidationComponent } from '../../validation/my-validation/my-validation.component';
import { HighlightDirective } from '../../../shared/ui/highlight/highlight.directive';

@Component({
  selector: 'app-awaiting-validation',
  standalone: true,
  imports: [HighlightDirective, AppShellComponent, MyValidationComponent],
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
}
