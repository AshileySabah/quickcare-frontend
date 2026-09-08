import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
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

export type ProfessionalType = 'MEDICO' | 'ENFERMEIRO' | 'TECNICO_ENFERMAGEM' | 'CUIDADOR';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

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
export class ProfessionalRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly httpBackend = inject(HttpBackend);
  private readonly http = new HttpClient(this.httpBackend);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly isLoadingCep = signal(false);

  protected readonly professionalTypeOptions: SelectOption[] = [
    { value: 'MEDICO', label: 'Médico(a)' },
    { value: 'ENFERMEIRO', label: 'Enfermeiro(a)' },
    { value: 'TECNICO_ENFERMAGEM', label: 'Técnico(a) de Enfermagem' },
    { value: 'CUIDADOR', label: 'Cuidador(a)' },
  ];

  protected readonly specialtyOptions: SelectOption[] = SPECIALTIES_MOCK.map((specialty) => ({
    value: specialty.id,
    label: specialty.name,
  }));

  protected readonly modalidadeOptions: SelectOption[] = [
    { value: 'PRESENCIAL', label: 'Presencial' },
    { value: 'REMOTO', label: 'Remoto' },
    { value: 'AMBOS', label: 'Ambos' },
  ];

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly filePreviewUrl = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      professionalType: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)]],
      specialtyId: [''],
      registrationNumber: [''],
      modalidadeAtendimento: ['', Validators.required],
      raioAtendimentoKm: [10, [Validators.required, Validators.min(1)]],
      cep: ['', [Validators.required, Validators.pattern(/^\d{5}-\d{3}$/)]],
      street: ['', Validators.required],
      neighborhood: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      number: ['', Validators.required],
      complement: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator() },
  );

  ngOnInit(): void {
    this.setupFormattersAndCep();

    this.form.controls.professionalType.valueChanges.subscribe((type) => {
      this.updateConditionalValidations(type as ProfessionalType);
    });
  }

  private setupFormattersAndCep(): void {
    // 1. CPF
    this.form.controls.cpf.valueChanges.subscribe((val) => {
      const raw = val.replace(/\D/g, '').slice(0, 11);
      let formatted = raw;
      if (raw.length > 9) {
        formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
      } else if (raw.length > 6) {
        formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
      } else if (raw.length > 3) {
        formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
      }
      if (val !== formatted) {
        this.form.controls.cpf.patchValue(formatted, { emitEvent: false });
      }
    });

    // 2. Telefone
    this.form.controls.phone.valueChanges.subscribe((val) => {
      const raw = val.replace(/\D/g, '').slice(0, 11);
      let formatted = raw;
      if (raw.length > 10) {
        formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
      } else if (raw.length > 6) {
        formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
      } else if (raw.length > 2) {
        formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
      }
      if (val !== formatted) {
        this.form.controls.phone.patchValue(formatted, { emitEvent: false });
      }
    });

    // 3. CEP e busca automática no ViaCEP
    this.form.controls.cep.valueChanges.subscribe((val) => {
      const raw = val.replace(/\D/g, '').slice(0, 8);
      let formatted = raw;
      if (raw.length > 5) {
        formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
      }
      if (val !== formatted) {
        this.form.controls.cep.patchValue(formatted, { emitEvent: false });
      }

      if (raw.length === 8) {
        this.fetchAddressByCep(raw);
      }
    });
  }

  private fetchAddressByCep(cleanCep: string): void {
    this.isLoadingCep.set(true);

    this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cleanCep}/json/`).subscribe({
      next: (data) => {
        this.isLoadingCep.set(false);

        if (data.erro) {
          this.toastService.error('CEP não encontrado.');
          return;
        }

        this.form.patchValue({
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        });
      },
      error: () => {
        this.isLoadingCep.set(false);
        this.toastService.error('Não foi possível autocompletar o endereço. Preencha manualmente.');
      },
    });
  }

  protected get currentType(): ProfessionalType | '' {
    return this.form.controls.professionalType.value as ProfessionalType | '';
  }

  protected get needsSpecialty(): boolean {
    return this.currentType === 'MEDICO' || this.currentType === 'ENFERMEIRO';
  }

  protected get needsRegistration(): boolean {
    return (
      this.currentType === 'MEDICO' ||
      this.currentType === 'ENFERMEIRO' ||
      this.currentType === 'TECNICO_ENFERMAGEM'
    );
  }

  protected get isFileRequired(): boolean {
    return true;
  }

  protected get documentLabel(): string {
    return this.currentType === 'CUIDADOR'
      ? 'Certificado do Curso de Cuidador'
      : 'Documento de Registro Profissional';
  }

  protected get registrationHint(): string {
    switch (this.currentType) {
      case 'MEDICO':
        return 'Ex.: CRM/SP 123456';
      case 'ENFERMEIRO':
      case 'TECNICO_ENFERMAGEM':
        return 'Ex.: COREN/SP 123456';
      default:
        return 'Ex.: CRM, COREN...';
    }
  }

  private updateConditionalValidations(type: ProfessionalType): void {
    const specialtyCtrl = this.form.controls.specialtyId;
    const registrationCtrl = this.form.controls.registrationNumber;

    if (type === 'MEDICO' || type === 'ENFERMEIRO') {
      specialtyCtrl.setValidators(Validators.required);
      registrationCtrl.setValidators(Validators.required);
    } else if (type === 'TECNICO_ENFERMAGEM') {
      specialtyCtrl.clearValidators();
      specialtyCtrl.setValue('');
      registrationCtrl.setValidators(Validators.required);
    } else {
      specialtyCtrl.clearValidators();
      specialtyCtrl.setValue('');
      registrationCtrl.clearValidators();
      registrationCtrl.setValue('');
    }

    specialtyCtrl.updateValueAndValidity();
    registrationCtrl.updateValueAndValidity();
  }

  protected fieldError(
    fieldName:
      | 'professionalType'
      | 'name'
      | 'email'
      | 'phone'
      | 'cpf'
      | 'specialtyId'
      | 'registrationNumber'
      | 'modalidadeAtendimento'
      | 'raioAtendimentoKm'
      | 'cep'
      | 'street'
      | 'neighborhood'
      | 'city'
      | 'state'
      | 'number'
      | 'complement'
      | 'password',
  ): string | null {
    const control = this.form.controls[fieldName];

    if (!control.touched) return null;
    if (control.hasError('required')) return 'Campo obrigatório.';

    if (fieldName === 'email' && control.hasError('email')) return 'E-mail inválido.';
    if (fieldName === 'password' && control.hasError('minlength')) return 'Senha deve ter ao menos 8 caracteres.';
    if (fieldName === 'cpf' && control.hasError('pattern')) return 'CPF deve conter 11 dígitos.';
    if (fieldName === 'phone' && control.hasError('pattern')) return 'Telefone incompleto.';
    if (fieldName === 'cep' && control.hasError('pattern')) return 'CEP incompleto.';
    if (fieldName === 'raioAtendimentoKm' && control.hasError('min')) return 'Informe um raio de atendimento válido.';

    return null;
  }

  protected get confirmPasswordError(): string | null {
    const control = this.form.controls.confirmPassword;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Confirme sua senha.';
    if (this.form.hasError('passwordsMismatch')) return 'As senhas não coincidem.';
    return null;
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

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
    if (currentPreview) URL.revokeObjectURL(currentPreview);

    this.selectedFile.set(null);
    this.filePreviewUrl.set(null);
    this.fileError.set(null);
  }

  protected submit(): void {
    const file = this.selectedFile();

    if (!file) {
      this.fileError.set('Envie o documento comprobatório para validação.');
    }

    if (this.form.invalid || !file) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValues = this.form.getRawValue();

    const payload = {
      ...formValues,
      cpf: formValues.cpf.replace(/\D/g, ''),
      phone: formValues.phone.replace(/\D/g, ''),
      cep: formValues.cep.replace(/\D/g, ''),
      professionalType: formValues.professionalType as ProfessionalType,
      modalidadeAtendimento: formValues.modalidadeAtendimento as 'PRESENCIAL' | 'REMOTO' | 'AMBOS',
      latitude: 0,
      longitude: 0,
      document: {
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        previewUrl: this.filePreviewUrl() ?? '',
      },
    };

    this.authService.registerProfessional(payload).subscribe({
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