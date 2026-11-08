import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { ClosureTarget, SwitchableRole, User } from '../../../core/models';
import { SecurityService } from '../../../core/services/security.service';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { revealFirstInvalid } from '../../../shared/ui/forms/invalid-field-focus.directive';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';

export interface ClosureResult {
  target: ClosureTarget;
  user: User | null;
}

const TARGET_LABELS: Record<ClosureTarget, string> = {
  patient: 'Só o perfil de paciente',
  professional: 'Só o perfil de profissional',
  account: 'A conta inteira',
};

@Component({
  selector: 'app-close-account-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent, InputComponent, SelectComponent],
  templateUrl: './close-account-dialog.component.html',
  styleUrl: './close-account-dialog.component.scss',
})
export class CloseAccountDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly securityService = inject(SecurityService);
  private readonly toastService = inject(ToastService);

  open = input(false);
  activeRoles = input<SwitchableRole[]>([]);

  readonly closedDialog = output<void>();
  readonly done = output<ClosureResult>();

  protected readonly step = signal<'password' | 'code'>('password');
  protected readonly loading = signal(false);
  protected readonly chosenTarget = signal<ClosureTarget>('account');

  protected readonly canChooseProfile = computed(() => this.activeRoles().length > 1);
  protected readonly targetOptions = computed<SelectOption[]>(() =>
    (this.canChooseProfile() ? (['patient', 'professional', 'account'] as ClosureTarget[]) : (['account'] as ClosureTarget[]))
      .map((target) => ({ value: target, label: TARGET_LABELS[target] })),
  );

  protected readonly passwordForm = this.fb.nonNullable.group({
    target: this.fb.nonNullable.control<ClosureTarget | ''>('', Validators.required),
    password: ['', Validators.required],
  });
  protected readonly passwordError = fieldErrorsFor(this.passwordForm, {
    target: { required: 'Escolha o que você quer encerrar.' },
    password: { required: 'Informe sua senha atual.' },
  });

  protected readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  protected readonly codeError = fieldErrorsFor(this.codeForm, {
    code: { required: 'Informe o código.', pattern: 'O código tem 6 números.' },
  });

  protected readonly title = computed(() => (this.chosenTarget() === 'account' ? 'Encerrar conta' : 'Encerrar perfil'));

  protected readonly consequences = computed(() => {
    const target = this.chosenTarget();
    const recovery =
      target === 'account'
        ? 'Por 30 dias, você pode recuperar a conta entrando com seu e-mail e senha ou pelo link que enviaremos por e-mail.'
        : 'Por 30 dias, você pode recuperar o perfil aqui na tela de Segurança.';
    return [
      'Solicitações, propostas e atendimentos em andamento ou agendados são cancelados, e a outra pessoa é avisada.',
      'Cancelar com menos de 48h do atendimento conta como ocorrência, como em qualquer cancelamento.',
      recovery + ' O que foi cancelado não volta.',
      'Denúncias, disputas, ocorrências, bloqueios e banimentos ficam congelados e voltam a valer se você recuperar.',
      'Depois de 30 dias, seus dados pessoais são apagados. Se criar uma conta nova com o mesmo documento, denúncias, bloqueios e banimentos continuam valendo.',
    ];
  });

  protected readonly confirmLabel = computed(() => {
    if (this.step() === 'password') {
      return 'Sim, enviar o código';
    }
    return this.chosenTarget() === 'account' ? 'Sim, encerrar a conta' : 'Sim, encerrar o perfil';
  });

  protected readonly cancelLabel = computed(() =>
    this.chosenTarget() === 'account' ? 'Não, manter a conta' : 'Não, manter o perfil',
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        untracked(() => this.restart());
      }
    });
    this.passwordForm.controls.target.valueChanges.subscribe((target) => {
      if (target) {
        this.chosenTarget.set(target);
      }
    });
  }

  protected message(): string {
    return this.step() === 'password'
      ? 'Escolha o que encerrar e confirme sua senha. Enviaremos um código para o seu e-mail.'
      : 'Digite o código de 6 números que enviamos para o seu e-mail. Ele vale por 10 minutos.';
  }

  protected confirm(): void {
    if (this.step() === 'password') {
      this.requestCode();
    } else {
      this.close();
    }
  }

  private requestCode(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      afterNextRender(() => revealFirstInvalid(this.host.nativeElement), { injector: this.injector });
      return;
    }
    const { target, password } = this.passwordForm.getRawValue();
    this.loading.set(true);
    this.securityService.requestClosureCode(target as ClosureTarget, password).subscribe({
      next: (message) => {
        this.loading.set(false);
        this.chosenTarget.set(target as ClosureTarget);
        this.codeForm.reset({ code: '' });
        this.step.set('code');
        this.toastService.success(message);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private close(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      afterNextRender(() => revealFirstInvalid(this.host.nativeElement), { injector: this.injector });
      return;
    }
    const target = this.chosenTarget();
    this.loading.set(true);
    this.securityService.close(target, this.codeForm.getRawValue().code).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.done.emit({ target, user });
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private restart(): void {
    const onlyAccount = !this.canChooseProfile();
    this.passwordForm.reset({ target: onlyAccount ? 'account' : '', password: '' });
    this.codeForm.reset({ code: '' });
    this.chosenTarget.set('account');
    this.step.set('password');
  }
}
