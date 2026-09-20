import { Component, OnInit, inject, signal } from '@angular/core';
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
import { SpecialtyService } from '../../../core/services/specialty.service';
import { AddressComponent } from '../../../shared/ui/address/address.component';
import { AvatarUploadComponent } from '../../../shared/ui/avatar-upload/avatar-upload.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CheckboxComponent } from '../../../shared/ui/checkbox/checkbox.component';
import { GridItemComponent } from '../../../shared/ui/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/grid/grid.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { MultiSelectComponent, MultiSelectOption } from '../../../shared/ui/multi-select/multi-select.component';
import { PasswordFieldsComponent } from '../../../shared/ui/password-fields/password-fields.component';
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

function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    const valid = value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
    return valid ? null : { weakPassword: true };
  };
}

function atLeastOneModalityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const presencial = control.get('attendsPresencial')?.value;
    const remoto = control.get('attendsRemoto')?.value;
    return presencial || remoto ? null : { modalityRequired: true };
  };
}

type FieldName =
  | 'name'
  | 'email'
  | 'phone'
  | 'cpf'
  | 'cnpj'
  | 'specialtyIds'
  | 'registrationNumber'
  | 'raioAtendimentoKm'
  | 'password';

type AddressFieldName = 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state';

@Component({
  selector: 'app-professional-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AddressComponent,
    AvatarUploadComponent,
    ButtonComponent,
    CheckboxComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    MultiSelectComponent,
    PasswordFieldsComponent,
  ],
  templateUrl: './professional-register.component.html',
  styleUrl: './professional-register.component.scss',
})
export class ProfessionalRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly specialtyOptions = signal<MultiSelectOption[]>([]);
  protected readonly avatarBlob = signal<Blob | null>(null);

  protected onAvatarChange(blob: Blob | null): void {
    this.avatarBlob.set(blob);
  }

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly filePreviewUrl = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly dragOver = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      cnpj: ['', [Validators.pattern(/^\d{14}$/)]],
      specialtyIds: this.fb.nonNullable.control<string[]>([], Validators.required),
      registrationNumber: ['', Validators.required],
      attendsPresencial: [false],
      attendsRemoto: [false],
      raioAtendimentoKm: [10, [Validators.min(1)]],
      address: this.fb.nonNullable.group({
        cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
        street: ['', Validators.required],
        number: ['', Validators.required],
        complement: [''],
        neighborhood: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
      }),
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', Validators.required],
    },
    { validators: [passwordsMatchValidator(), atLeastOneModalityValidator()] },
  );

  constructor() {
    this.form.controls.attendsPresencial.valueChanges.subscribe((presencial) => {
      const raioControl = this.form.controls.raioAtendimentoKm;

      if (presencial) {
        raioControl.setValidators([Validators.required, Validators.min(1)]);
      } else {
        raioControl.clearValidators();
      }

      raioControl.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.specialtyService.list().subscribe((specialties) => {
      this.specialtyOptions.set(specialties.map((specialty) => ({ value: specialty.id, label: specialty.name })));
    });
  }

  protected get modalityError(): string | null {
    const touched = this.form.controls.attendsPresencial.touched || this.form.controls.attendsRemoto.touched;
    return touched && this.form.hasError('modalityRequired') ? 'Selecione ao menos uma modalidade de atendimento.' : null;
  }

  protected fieldError = (fieldName: FieldName): string | null => {
    const control = this.form.controls[fieldName];

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return fieldName === 'specialtyIds' ? 'Selecione ao menos uma especialidade.' : 'Campo obrigatório.';
    }

    if (fieldName === 'email' && control.hasError('email')) {
      return 'E-mail inválido.';
    }

    if (fieldName === 'password' && control.hasError('weakPassword')) {
      return 'A senha não atende aos requisitos mínimos.';
    }

    if (fieldName === 'cpf' && control.hasError('pattern')) {
      return 'CPF deve conter 11 dígitos, sem pontuação.';
    }

    if (fieldName === 'cnpj' && control.hasError('pattern')) {
      return 'CNPJ deve conter 14 dígitos, sem pontuação.';
    }

    if (fieldName === 'raioAtendimentoKm' && control.hasError('min')) {
      return 'Informe um raio de atendimento válido.';
    }

    return null;
  };

  protected addressFieldError = (fieldName: string): string | null => {
    const control = this.form.controls.address.get(fieldName as AddressFieldName);

    if (!control || !control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (fieldName === 'cep' && control.hasError('pattern')) {
      return 'CEP deve conter 8 dígitos, sem hífen.';
    }

    if (fieldName === 'state' && control.hasError('pattern')) {
      return 'Informe a sigla do estado (ex.: SP).';
    }

    return null;
  };

  protected get passwordError(): string | null {
    return this.fieldError('password');
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
    this.handleFile(input.files?.[0] ?? null);
    input.value = '';
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    this.handleFile(event.dataTransfer?.files?.[0] ?? null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected onDragLeave(): void {
    this.dragOver.set(false);
  }

  private handleFile(file: File | null): void {
    if (!file) {
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      this.fileError.set('Formato inválido. Envie um arquivo PDF, JPG ou PNG.');
      this.selectedFile.set(null);
      this.filePreviewUrl.set(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError.set('O arquivo deve ter no máximo 5MB.');
      this.selectedFile.set(null);
      this.filePreviewUrl.set(null);
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
    const {
      name,
      email,
      phone,
      cpf,
      cnpj,
      specialtyIds,
      registrationNumber,
      attendsPresencial,
      attendsRemoto,
      raioAtendimentoKm,
      address,
      password,
    } = this.form.getRawValue();

    const modalidadeAtendimento =
      attendsPresencial && attendsRemoto ? 'AMBOS' : attendsPresencial ? 'PRESENCIAL' : 'REMOTO';

    this.authService
      .registerProfessional({
        name,
        email,
        phone,
        cpf,
        cnpj: cnpj || undefined,
        specialtyIds,
        registrationNumber,
        password,
        modalidadeAtendimento,
        raioAtendimentoKm: attendsPresencial ? raioAtendimentoKm : undefined,
        address: {
          cep: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement || undefined,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
        },
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
          this.toastService.success('Cadastro realizado com sucesso!');
          this.router.navigateByUrl('/professional');
        },
        error: (error: Error) => {
          this.isSubmitting.set(false);
          this.toastService.error(error.message);
        },
      });
  }
}
