import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  private readonly queryParams = this.route.snapshot.queryParamMap;

  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      email: [
        this.queryParams.get('email') ?? '',
        [Validators.required, Validators.email],
      ],
      token: [this.queryParams.get('token') ?? '', [Validators.required]],
      // TROQUE pelas mesmas regras de senha da tela de cadastro (8+, maiúscula, minúscula, especial)
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected fieldError(
    fieldName: 'email' | 'token' | 'password' | 'confirmPassword',
  ): string | null {
    const control = this.form.controls[fieldName];

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (fieldName === 'email' && control.hasError('email')) {
      return 'E-mail inválido.';
    }

    if (fieldName === 'password' && control.hasError('minlength')) {
      return 'Senha deve ter ao menos 8 caracteres.';
    }

    if (
      fieldName === 'confirmPassword' &&
      this.form.hasError('passwordsMismatch')
    ) {
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
    const { email, token, password } = this.form.getRawValue();

    this.authService.resetPassword(email, token, password).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(
          'Senha redefinida com sucesso. Entre com a nova senha.',
        );
        this.router.navigateByUrl('/login');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
