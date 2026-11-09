import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';
import { AuthLayoutComponent } from '../../../shared/ui/layout/auth-layout/auth-layout.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';

type PageState = 'validating' | 'form' | 'invalid-link';

@Component({
  selector: 'app-undo-email-change',
  standalone: true,
  imports: [
    InvalidFieldFocusDirective,
    AuthLayoutComponent,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
  ],
  templateUrl: './undo-email-change.component.html',
})
export class UndoEmailChangeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  private token = '';

  protected readonly state = signal<PageState>('validating');
  protected readonly stateMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    password: ['', Validators.required],
  });
  protected readonly fieldError = fieldErrorsFor(this.form, {
    password: { required: 'Informe a senha que a conta tinha antes da troca.' },
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.showInvalid('Este link para desfazer a troca de e-mail é inválido.');
      return;
    }
    this.router.navigate([], { queryParams: {}, replaceUrl: true });

    this.authService.validateEmailUndo(this.token).subscribe({
      next: () => this.state.set('form'),
      error: (error: Error) => this.showInvalid(error.message),
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.authService.undoEmailChange(this.token, this.form.getRawValue().password).subscribe({
      next: (resetToken) => {
        this.isSubmitting.set(false);
        this.toastService.success('Troca desfeita. Agora crie uma senha nova para proteger a conta.', 8000);
        this.router.navigate(['/redefinir-senha'], { queryParams: { token: resetToken } });
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private showInvalid(message: string): void {
    this.stateMessage.set(message);
    this.state.set('invalid-link');
  }
}
