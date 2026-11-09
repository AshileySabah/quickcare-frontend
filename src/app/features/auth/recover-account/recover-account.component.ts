import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { homeRouteFor } from '../../../core/auth/home-route';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';

type PageState = 'recovering' | 'invalid-link';

@Component({
  selector: 'app-recover-account',
  standalone: true,
  imports: [AuthLayoutComponent, ButtonComponent, RouterLink],
  templateUrl: './recover-account.component.html',
})
export class RecoverAccountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly state = signal<PageState>('recovering');
  protected readonly stateMessage = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.showInvalid('Este link de recuperação é inválido.');
      return;
    }
    this.router.navigate([], { queryParams: {}, replaceUrl: true });

    this.authService.recoverAccountByLink(token).subscribe({
      next: (user) => {
        this.toastService.success('Conta recuperada. Que bom ter você de volta!');
        this.router.navigateByUrl(homeRouteFor(user));
      },
      error: (error: Error) => this.showInvalid(error.message),
    });
  }

  private showInvalid(message: string): void {
    this.stateMessage.set(message);
    this.state.set('invalid-link');
  }
}
