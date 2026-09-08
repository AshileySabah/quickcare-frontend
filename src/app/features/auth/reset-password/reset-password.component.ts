import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';

const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({
      ...confirmPassword.errors,
      passwordMismatch: true,
    });
    return { passwordMismatch: true };
  }
  return null;
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  private token = '';
  protected isLoading = false;
  protected errorMessage = '';
  protected isSuccess = false;

  protected readonly resetForm = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator }
  );

  ngOnInit(): void {
    // Captura o token de ?token=... ou da rota :token
    this.token =
      this.route.snapshot.queryParamMap.get('token') ??
      this.route.snapshot.paramMap.get('token') ??
      '';

    if (!this.token) {
      this.errorMessage = 'Token de redefinição ausente ou inválido.';
    }
  }

  protected fieldError(
    fieldName: 'password' | 'confirmPassword'
  ): string | null {
    const control = this.resetForm.controls[fieldName];

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (fieldName === 'password' && control.hasError('minlength')) {
      return 'Senha deve ter ao menos 6 caracteres.';
    }

    if (fieldName === 'confirmPassword' && control.hasError('passwordMismatch')) {
      return 'As senhas não coincidem.';
    }

    return null;
  }

  protected onSubmit(): void {
    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      token: this.token,
      newPassword: this.resetForm.getRawValue().password,
    };

    this.http.post('/api/auth/reset-password', payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.message ||
          'Link expirado ou inválido. Solicite novamente.';
      },
    });
  }
}