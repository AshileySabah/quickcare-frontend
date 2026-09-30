import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AuthService,
  InvalidPasswordResetLinkError,
} from '../../../core/auth/auth.service';
import { homeRouteFor } from '../../../core/auth/home-route';
import {
  passwordsMatchValidator,
  strongPasswordValidator,
} from '../../../core/forms/password-validators';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { PasswordFieldsComponent } from '../../../shared/ui/forms/password-fields/password-fields.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

type PageState = 'validating' | 'form' | 'invalid-link' | 'error';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    GridComponent,
    GridItemComponent,
    PasswordFieldsComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  private token = '';

  protected readonly state = signal<PageState>('validating');
  protected readonly isSubmitting = signal(false);
  protected readonly stateMessage = signal('');

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator() },
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.showInvalidLink(
        'Este link de redefinição é inválido. Peça um novo para continuar.',
      );
      return;
    }

    this.router.navigate([], { queryParams: {}, replaceUrl: true });

    this.validateToken();
  }

  protected validateToken(): void {
    this.state.set('validating');

    this.authService.validatePasswordResetToken(this.token).subscribe({
      next: () => this.state.set('form'),
      error: (error: Error) => {
        if (error instanceof InvalidPasswordResetLinkError) {
          this.showInvalidLink(error.message);
          return;
        }

        this.stateMessage.set(error.message);
        this.state.set('error');
      },
    });
  }

  private showInvalidLink(message: string): void {
    this.stateMessage.set(message);
    this.state.set('invalid-link');
  }

  protected get passwordError(): string | null {
    const control = this.form.controls.password;

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (control.hasError('weakPassword')) {
      return 'A senha não atende aos requisitos.';
    }

    return null;
  }

  protected get confirmPasswordError(): string | null {
    const control = this.form.controls.confirmPassword;

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (this.form.hasError('passwordsMismatch')) {
      return 'As senhas não conferem.';
    }

    return null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.authService
      .resetPassword(this.token, this.form.getRawValue().password)
      .subscribe({
        next: ({ message, user }) => {
          this.isSubmitting.set(false);
          this.toastService.success(message);
          this.router.navigateByUrl(homeRouteFor(user));
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);

          if (error instanceof InvalidPasswordResetLinkError) {
            this.showInvalidLink(error.message);
            return;
          }

          this.toastService.error(error.message);
        },
      });
  }
}
