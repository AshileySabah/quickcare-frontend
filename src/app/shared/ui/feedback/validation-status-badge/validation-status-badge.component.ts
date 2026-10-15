import { Component, computed, input } from '@angular/core';
import { ValidationStatus, ValidationStepStatus } from '../../../../core/models';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';

const PRESENTATION: Record<ValidationStatus | ValidationStepStatus, { label: string; variant: BadgeVariant }> = {
  pendente: { label: 'Em análise', variant: 'warning' },
  aprovado: { label: 'Aprovado', variant: 'success' },
  reprovado: { label: 'Reprovado', variant: 'error' },
  aprovada: { label: 'Aprovada', variant: 'success' },
  reprovada: { label: 'Reprovada', variant: 'error' },
};

/** Status da validação cadastral (do cadastro como um todo ou de uma etapa). */
@Component({
  selector: 'ui-validation-status-badge',
  standalone: true,
  imports: [BadgeComponent],
  template: `<ui-badge [variant]="presentation().variant">{{ presentation().label }}</ui-badge>`,
})
export class ValidationStatusBadgeComponent {
  status = input.required<ValidationStatus | ValidationStepStatus>();

  protected readonly presentation = computed(() => PRESENTATION[this.status()]);
}
