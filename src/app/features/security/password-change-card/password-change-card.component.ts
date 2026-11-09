import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { controlError, fieldErrorsFor } from '../../../core/forms/field-errors';
import { passwordsMatchValidator, strongPasswordValidator } from '../../../core/forms/password-validators';
import { SecurityService } from '../../../core/services/security.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';
import { PasswordFieldsComponent } from '../../../shared/ui/forms/password-fields/password-fields.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';

@Component({
  selector: 'app-password-change-card',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InvalidFieldFocusDirective,
    ButtonComponent,
    CardComponent,
    InputComponent,
    PasswordFieldsComponent,
  ],
  templateUrl: './password-change-card.component.html',
  styleUrl: '../security-card.scss',
})
export class PasswordChangeCardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly securityService = inject(SecurityService);
  private readonly toastService = inject(ToastService);

  protected readonly loading = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator() },
  );
  protected readonly fieldError = fieldErrorsFor(this.form, {
    currentPassword: { required: 'Informe sua senha atual.' },
    password: { weakPassword: 'A senha não atende aos requisitos.' },
  });

  protected confirmPasswordError(): string | null {
    const control = this.form.controls.confirmPassword;
    const error = controlError(control);
    if (error) {
      return error;
    }
    return control.touched && this.form.hasError('passwordsMismatch') ? 'As senhas não conferem.' : null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, password } = this.form.getRawValue();
    this.loading.set(true);
    this.securityService.changePassword(currentPassword, password).subscribe({
      next: (message) => {
        this.loading.set(false);
        this.form.reset({ currentPassword: '', password: '', confirmPassword: '' });
        this.toastService.success(message);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
