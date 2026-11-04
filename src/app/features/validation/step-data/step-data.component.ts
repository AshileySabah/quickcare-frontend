import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RegistrationData, ValidationStepType } from '../../../core/models';
import { formatMasked } from '../../../shared/ui/forms/input/input-mask.util';
import { GENDER_OPTIONS } from '../../../shared/ui/register/register-options';

@Component({
  selector: 'app-step-data',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './step-data.component.html',
  styleUrl: './step-data.component.scss',
})
export class StepDataComponent {
  type = input.required<ValidationStepType>();
  data = input.required<RegistrationData>();
  registrationLabel = input('Registro profissional');
  showOwner = input(false);

  protected readonly cpf = computed(() => formatMasked('cpf', this.data().cpf));
  protected readonly cnpj = computed(() => {
    const cnpj = this.data().cnpj;
    return cnpj ? formatMasked('cnpj', cnpj) : 'Não informado';
  });
  protected readonly gender = computed(
    () => GENDER_OPTIONS.find((option) => option.value === this.data().gender)?.label ?? 'Não informado',
  );
}
