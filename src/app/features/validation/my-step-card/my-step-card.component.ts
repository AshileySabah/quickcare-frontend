import { Component, OnInit, input, output, signal } from '@angular/core';
import { RegistrationData, ValidationDetail, ValidationProfile, ValidationStep, ValidationStepType } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { ValidationStatusBadgeComponent } from '../../../shared/ui/feedback/validation-status-badge/validation-status-badge.component';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { SelectOption } from '../../../shared/ui/forms/select/select.component';
import { StoredFileComponent } from '../../../shared/ui/stored-file/stored-file.component';
import { ResubmitStepFormComponent } from '../resubmit-step-form/resubmit-step-form.component';
import { StepDataComponent } from '../step-data/step-data.component';

@Component({
  selector: 'app-my-step-card',
  standalone: true,
  imports: [
    ButtonComponent,
    CardComponent,
    IconComponent,
    ResubmitStepFormComponent,
    StepDataComponent,
    StoredFileComponent,
    ValidationStatusBadgeComponent,
  ],
  templateUrl: './my-step-card.component.html',
  styleUrl: './my-step-card.component.scss',
})
export class MyStepCardComponent implements OnInit {
  profile = input.required<ValidationProfile>();
  type = input.required<ValidationStepType>();
  heading = input.required<string>();
  step = input<ValidationStep | null>(null);
  data = input.required<RegistrationData>();
  ufOptions = input<SelectOption[]>([]);
  registrationLabel = input('Registro profissional');
  emptyText = input<string | null>(null);

  resubmitted = output<ValidationDetail>();

  protected readonly editing = signal(false);

  ngOnInit(): void {
    this.editing.set(this.step()?.status === 'reprovada');
  }

  protected onResubmitted(detail: ValidationDetail): void {
    this.editing.set(false);
    this.resubmitted.emit(detail);
  }
}
