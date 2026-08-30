import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SPECIALTIES_MOCK } from '../../../mocks';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordsMismatch: true } : null;
  };
}

@Component({
  selector: 'app-professional-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './professional-register.component.html',
  styleUrl: './professional-register.component.scss',
})
export class ProfessionalRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);

  protected readonly specialtyOptions: SelectOption[] = SPECIALTIES_MOCK.map((specialty) => ({
    value: specialty.id,
    label: specialty.name,
  }));

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly filePreviewUrl = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      cpf: ['', Validators.required],
      specialtyId: ['', Validators.required],
      registrationNumber: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator() },
  );

  protected fieldError(
    fieldName: 'name' | 'email' | 'phone' | 'cpf' | 'specialtyId' | 'registrationNumber' | 'password',
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
      return 'Senha deve ter ao menos 6 caracteres.';
    }

    return null;
  }

  protected get confirmPasswordError(): string | null {
    const control = this.form.controls.confirmPassword;

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Confirme sua senha.';
    }

    if (this.form.hasError('passwordsMismatch')) {
      return 'As senhas não coincidem.';
    }

    return null;
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      this.fileError.set('Formato inválido. Envie um arquivo PDF, JPG ou PNG.');
      this.selectedFile.set(null);
      this.filePreviewUrl.set(null);
      input.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError.set('O arquivo deve ter no máximo 5MB.');
      this.selectedFile.set(null);
      this.filePreviewUrl.set(null);
      input.value = '';
      return;
    }

    this.fileError.set(null);
    this.selectedFile.set(file);
    this.filePreviewUrl.set(URL.createObjectURL(file));
  }

  protected removeFile(): void {
    const currentPreview = this.filePreviewUrl();

    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }

    this.selectedFile.set(null);
    this.filePreviewUrl.set(null);
    this.fileError.set(null);
  }

  protected submit(): void {
    const file = this.selectedFile();

    if (!file) {
      this.fileError.set('Envie o documento de registro profissional.');
    }

    if (this.form.invalid || !file) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { name, email, phone, cpf, specialtyId, registrationNumber, password } = this.form.getRawValue();

    this.authService
      .registerProfessional({
        name,
        email,
        phone,
        cpf,
        specialtyId,
        registrationNumber,
        password,
        document: {
          fileName: file.name,
          fileType: file.type,
          fileSizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          previewUrl: this.filePreviewUrl() ?? '',
        },
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastService.success('Cadastro enviado! Aguarde a validação do seu documento.');
          this.router.navigateByUrl('/professional/aguardando-validacao');
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);
          this.toastService.error(error.message);
        },
      });
  }
}
