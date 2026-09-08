import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent
  ],
  templateUrl: './password-recovery.component.html',
  styleUrls: ['./password-recovery.component.scss']
})
export class PasswordRecoveryComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly recoveryForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  protected isLoading = false;
  protected successMessage = '';
  protected errorMessage = '';

  protected fieldError(fieldName: 'email'): string | null {
    const control = this.recoveryForm.controls[fieldName];

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

  protected onSubmit(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = this.recoveryForm.getRawValue();

    this.http.post('/api/auth/password-reset', payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Se o e-mail estiver cadastrado, as instruções para redefinição foram enviadas.';
        this.recoveryForm.reset();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Ocorreu um erro ao solicitar a recuperação. Tente novamente mais tarde.';
      }
    });
  }
}