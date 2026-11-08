import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SUSPENSION_DAY_OPTIONS } from '../../../core/models';
import { CheckboxComponent } from '../../../shared/ui/forms/checkbox/checkbox.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { BanForm, MAX_SUSPENSION_DAYS } from './ban-form';

@Component({
  selector: 'app-ban-fields',
  standalone: true,
  imports: [ReactiveFormsModule, CheckboxComponent, InputComponent, SelectComponent],
  template: `
    <div class="ban-fields" [formGroup]="group()">
      <ui-select
        label="Tipo de banimento"
        formControlName="type"
        [options]="typeOptions"
        [required]="true"
        [errorMessage]="error('type', 'Escolha o tipo de banimento.')"
      ></ui-select>
      @if (group().controls.type.value === 'suspensao') {
        <ui-select
          label="Duração"
          formControlName="daysOption"
          [options]="dayOptions"
          [required]="true"
          [errorMessage]="error('daysOption', 'Escolha a duração da suspensão.')"
        ></ui-select>
        @if (group().controls.daysOption.value === 'outro') {
          <ui-input
            label="Quantos dias"
            type="number"
            formControlName="customDays"
            [required]="true"
            min="1"
            [max]="maxDays"
            [errorMessage]="error('customDays', 'Informe de 1 a ' + maxDays + ' dias.')"
          ></ui-input>
        }
      }
      @if (showBothProfiles()) {
        <ui-checkbox
          formControlName="bothProfiles"
          label="Banir também o outro perfil desta pessoa"
          hint="Só se ela tiver os dois perfis (paciente e profissional)."
        ></ui-checkbox>
      }
    </div>
  `,
  styles: `
    @use 'tokens' as tokens;

    .ban-fields {
      display: flex;
      flex-direction: column;
      gap: tokens.space(3);
    }
  `,
})
export class BanFieldsComponent {
  group = input.required<BanForm>();
  showBothProfiles = input(false);

  protected readonly maxDays = String(MAX_SUSPENSION_DAYS);
  protected readonly typeOptions: SelectOption[] = [
    { value: 'suspensao', label: 'Suspensão por um período' },
    { value: 'permanente', label: 'Permanente' },
  ];
  protected readonly dayOptions: SelectOption[] = [
    ...SUSPENSION_DAY_OPTIONS.map((days) => ({ value: String(days), label: `${days} dias` })),
    { value: 'outro', label: 'Outro número de dias' },
  ];

  protected error(field: 'type' | 'daysOption' | 'customDays', message: string): string | null {
    const control = this.group().controls[field];
    return control.touched && control.invalid ? message : null;
  }
}
