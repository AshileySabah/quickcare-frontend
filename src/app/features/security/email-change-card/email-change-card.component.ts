import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { User } from '../../../core/models';
import { SecurityService } from '../../../core/services/security.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';

@Component({
  selector: 'app-email-change-card',
  standalone: true,
  imports: [ReactiveFormsModule, InvalidFieldFocusDirective, ButtonComponent, CardComponent, InputComponent],
  templateUrl: './email-change-card.component.html',
  styleUrl: '../security-card.scss',
})
export class EmailChangeCardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly securityService = inject(SecurityService);
  private readonly toastService = inject(ToastService);

  currentEmail = input.required<string>();

  readonly changed = output<User>();

  protected readonly step = signal<'request' | 'confirm'>('request');
  protected readonly loading = signal(false);
  protected readonly pendingEmail = signal('');

  protected readonly requestForm = this.fb.nonNullable.group({
    newEmail: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', Validators.required],
  });
  protected readonly requestError = fieldErrorsFor(this.requestForm, {
    newEmail: { required: 'Informe o novo e-mail.' },
    password: { required: 'Informe sua senha atual.' },
  });

  protected readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  protected readonly codeError = fieldErrorsFor(this.codeForm, {
    code: { required: 'Informe o código.', pattern: 'O código tem 6 números.' },
  });

  protected requestCode(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    const { newEmail, password } = this.requestForm.getRawValue();
    this.loading.set(true);
    this.securityService.requestEmailCode(newEmail, password).subscribe({
      next: (message) => {
        this.loading.set(false);
        this.pendingEmail.set(newEmail.trim());
        this.codeForm.reset({ code: '' });
        this.step.set('confirm');
        this.toastService.success(message);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected confirm(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.securityService.confirmEmail(this.codeForm.getRawValue().code).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.toastService.success('E-mail alterado. Use o novo e-mail para entrar; os outros dispositivos foram desconectados.');
        this.restart();
        this.changed.emit(user);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected restart(): void {
    this.requestForm.reset({ newEmail: '', password: '' });
    this.codeForm.reset({ code: '' });
    this.pendingEmail.set('');
    this.step.set('request');
  }
}
