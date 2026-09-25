import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../input/input.component';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

@Component({
  selector: 'ui-password-fields',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent],
  templateUrl: './password-fields.component.html',
  styleUrl: './password-fields.component.scss',
})
export class PasswordFieldsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  group = input.required<FormGroup>();
  passwordControlName = input('password');
  confirmControlName = input('confirmPassword');
  passwordLabel = input('Senha');
  confirmLabel = input('Confirmar senha');
  passwordError = input<string | null>(null);
  confirmPasswordError = input<string | null>(null);

  protected readonly passwordValue = signal('');

  protected readonly requirements = signal<PasswordRequirement[]>([]);

  ngOnInit(): void {
    const control = this.group().get(this.passwordControlName());
    this.updateRequirements(control?.value ?? '');

    control?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value: string) => {
      this.updateRequirements(value ?? '');
    });
  }

  private updateRequirements(value: string): void {
    this.passwordValue.set(value);
    this.requirements.set([
      { label: 'Mínimo de 8 caracteres', met: value.length >= 8 },
      { label: 'Uma letra maiúscula', met: /[A-Z]/.test(value) },
      { label: 'Uma letra minúscula', met: /[a-z]/.test(value) },
      { label: 'Um número', met: /\d/.test(value) },
      { label: 'Um caractere especial', met: /[^A-Za-z0-9]/.test(value) },
    ]);
  }
}
