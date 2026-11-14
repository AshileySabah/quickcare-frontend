import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionExpiredService } from '../../../core/auth/session-expired.service';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

@Component({
  selector: 'app-session-expired-dialog',
  standalone: true,
  imports: [InvalidFieldFocusDirective, ReactiveFormsModule, ConfirmDialogComponent, InputComponent],
  templateUrl: './session-expired-dialog.component.html',
})
export class SessionExpiredDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly sessionExpired = inject(SessionExpiredService);
  private readonly toastService = inject(ToastService);

  protected readonly open = this.sessionExpired.open;
  protected readonly isSubmitting = signal(false);
  protected readonly message = computed(() => {
    const email = this.authService.currentUser()?.email;
    return email
      ? `Por segurança, entre de novo como ${email}. O que você preencheu continua na tela e será salvo em seguida.`
      : 'Por segurança, entre de novo. O que você preencheu continua na tela e será salvo em seguida.';
  });

  protected readonly form = this.fb.nonNullable.group({
    password: ['', Validators.required],
  });
  protected readonly fieldError = fieldErrorsFor(this.form, {
    password: { required: 'Informe sua senha.' },
  });

  constructor() {
    effect(() => {
      if (this.open() && !this.authService.currentUser()) {
        queueMicrotask(() => this.sessionExpired.finish(false));
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.authService.reauthenticate(this.form.getRawValue().password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.form.reset();
        this.sessionExpired.finish(true);
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected cancel(): void {
    this.form.reset();
    this.sessionExpired.finish(false);
    this.toastService.error('Sessão expirada. Entre novamente para salvar.');
  }
}
