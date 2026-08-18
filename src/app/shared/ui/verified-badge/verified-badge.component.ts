import { Component, computed, input } from '@angular/core';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { ProfessionalValidationStatus } from '../../../core/models';

interface VerifiedPresentation {
  label: string;
  variant: BadgeVariant;
}

const VALIDATION_PRESENTATION: Record<ProfessionalValidationStatus, VerifiedPresentation> = {
  aprovado: { label: 'Verificado', variant: 'primary' },
  pendente: { label: 'Pendente', variant: 'neutral' },
  reprovado: { label: 'Reprovado', variant: 'error' },
};

@Component({
  selector: 'ui-verified-badge',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './verified-badge.component.html',
})
export class VerifiedBadgeComponent {
  status = input.required<ProfessionalValidationStatus>();

  protected readonly presentation = computed(() => VALIDATION_PRESENTATION[this.status()]);
}
