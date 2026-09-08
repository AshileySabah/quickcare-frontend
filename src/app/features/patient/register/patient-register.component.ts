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
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordsMismatch: true } : null;
  };
}

@Component({
  selector: 'app-patient-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, InputComponent],
  templateUrl: './patient-register.component.html',
  styleUrl: './patient-register.component.scss',
})
export class PatientRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly httpBackend = inject(HttpBackend);
  private readonly http = new HttpClient(this.httpBackend);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly isSubmitting = signal(false);
  protected readonly isLoadingCep = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required]],
      dateOfBirth: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
      emergencyContact: ['', [Validators.required]],
      emergencyPhone: ['', [Validators.required, Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
      cep: ['', [Validators.required, Validators.pattern(/^\d{5}-\d{3}$/)]],
      street: ['', [Validators.required]],
      neighborhood: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      number: ['', [Validators.required]],
      complement: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator() },
  );

  ngOnInit(): void {
    this.setupAutoFormatters();
  }

  private setupAutoFormatters(): void {
    // 1. Data de Nascimento (DD/MM/AAAA)
    this.form.controls.dateOfBirth.valueChanges.subscribe((val) => {
      const raw = val.replace(/\D/g, '').slice(0, 8);
      let formatted = raw;
      if (raw.length > 2 && raw.length <= 4) {
        formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
      } else if (raw.length > 4) {
        formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
      }
      if (val !== formatted) {
        this.form.controls.dateOfBirth.patchValue(formatted, { emitEvent: false });
      }
    });

    // 2. CPF (000.000.000-00)
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

    // 3. Telefones: (00) 0000-0000 ou (00) 00000-0000
    const applyPhoneMask = (controlName: 'phone' | 'emergencyPhone') => {
      this.form.controls[controlName].valueChanges.subscribe((val) => {
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
          this.form.controls[controlName].patchValue(formatted, { emitEvent: false });
        }
      });
    };

    applyPhoneMask('phone');
    applyPhoneMask('emergencyPhone');

    // 4. CEP (00000-000) e busca automática no ViaCEP
    this.form.controls.cep.valueChanges.subscribe((val) => {
      const raw = val.replace(/\D/g, '').slice(0, 8);
      let formatted = raw;
      if (raw.length > 5) {
        formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
      }
      if (val !== formatted) {
        this.form.controls.cep.patchValue(formatted, { emitEvent: false });
      }

      // Se completou os 8 dígitos numéricos, dispara a busca
      if (raw.length === 8) {
        this.fetchAddressByCep(raw);
      }
    });
  }

  protected fetchAddressByCep(cleanCep: string): void {
    this.isLoadingCep.set(true);

    this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cleanCep}/json/`).subscribe({
      next: (data) => {
        this.isLoadingCep.set(false);

        if (data.erro) {
          this.toastService.error('CEP não encontrado.');
          this.clearAddressFields();
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

  private clearAddressFields(): void {
    this.form.patchValue({
      street: '',
      neighborhood: '',
      city: '',
      state: '',
    });
  }

  protected fieldError(
    fieldName:
      | 'name'
      | 'dateOfBirth'
      | 'cpf'
      | 'email'
      | 'phone'
      | 'emergencyContact'
      | 'emergencyPhone'
      | 'cep'
      | 'street'
      | 'neighborhood'
      | 'city'
      | 'state'
      | 'number'
      | 'complement'
      | 'password'
      | 'confirmPassword'
  ): string | null {
    const control = this.form.controls[fieldName];

    if (!control.touched) return null;
    if (control.hasError('required')) return 'Campo obrigatório.';

    if (fieldName === 'email' && control.hasError('email')) return 'E-mail inválido.';
    if (fieldName === 'password' && control.hasError('minlength')) return 'Senha deve ter ao menos 8 caracteres.';
    if (fieldName === 'cpf' && control.hasError('pattern')) return 'CPF deve conter 11 dígitos.';
    if (fieldName === 'dateOfBirth' && control.hasError('pattern')) return 'Data inválida (dd/mm/aaaa).';
    if ((fieldName === 'phone' || fieldName === 'emergencyPhone') && control.hasError('pattern')) {
      return 'Telefone incompleto.';
    }
    if (fieldName === 'cep' && control.hasError('pattern')) return 'CEP incompleto.';

    return null;
  }

  protected get confirmPasswordError(): string | null {
    const control = this.form.controls.confirmPassword;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Confirme sua senha.';
    if (this.form.hasError('passwordsMismatch')) return 'As senhas não coincidem.';
    return null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValues = this.form.getRawValue();

    const payload = {
      ...formValues,
      cpf: formValues.cpf.replace(/\D/g, ''),
      phone: formValues.phone.replace(/\D/g, ''),
      emergencyPhone: formValues.emergencyPhone.replace(/\D/g, ''),
      cep: formValues.cep.replace(/\D/g, ''),
    };

    this.authService.registerPatient(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success('Cadastro realizado com sucesso!');
        this.router.navigateByUrl('/patient');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}