import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly sentTo = signal<string | null>(null);
  protected readonly sentMessage = signal('');
  protected readonly resendCountdown = signal(0);

  private countdownTimer?: ReturnType<typeof setInterval>;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.countdownTimer));
  }

  protected fieldError(): string | null {
    const control = this.form.controls.email;

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (control.hasError('email')) {
      return 'E-mail inválido.';
    }

    return null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.send(this.form.getRawValue().email.trim());
  }

  protected resend(): void {
    const email = this.sentTo();

    if (email && this.resendCountdown() === 0) {
      this.send(email);
    }
  }

  protected useAnotherEmail(): void {
    clearInterval(this.countdownTimer);
    this.resendCountdown.set(0);
    this.sentTo.set(null);
    this.form.reset();
  }

  private send(email: string): void {
    this.isSubmitting.set(true);

    this.authService.requestPasswordReset(email).subscribe({
      next: (message) => {
        this.isSubmitting.set(false);
        this.sentTo.set(email);
        this.sentMessage.set(message);
        this.startCountdown();
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private startCountdown(): void {
    clearInterval(this.countdownTimer);
    this.resendCountdown.set(RESEND_COOLDOWN_SECONDS);

    this.countdownTimer = setInterval(() => {
      this.resendCountdown.update((seconds) => seconds - 1);

      if (this.resendCountdown() <= 0) {
        clearInterval(this.countdownTimer);
      }
    }, 1000);
  }
}
