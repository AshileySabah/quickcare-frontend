import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { homeRouteFor } from '../../../core/auth/home-route';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';

type PageState = 'validating' | 'invalid-link';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [AuthLayoutComponent, RouterLink, ButtonComponent],
  templateUrl: './confirm-email.component.html',
})
export class ConfirmEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly state = signal<PageState>('validating');
  protected readonly stateMessage = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.showInvalid('Este link de confirmação é inválido.');
      return;
    }
    this.router.navigate([], { queryParams: {}, replaceUrl: true });

    this.authService.confirmEmail(token).subscribe({
      next: (user) => {
        this.toastService.success('E-mail confirmado. Boas-vindas ao QuickCare!');
        this.router.navigateByUrl(homeRouteFor(user), { replaceUrl: true });
      },
      error: (error: Error) => this.showInvalid(error.message),
    });
  }

  private showInvalid(message: string): void {
    this.stateMessage.set(message);
    this.state.set('invalid-link');
  }
}
