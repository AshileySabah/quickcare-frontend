import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { PreValidationOpinion, PreValidationResult } from '../../../core/models';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

/** Estado da pré-validação de uma etapa na tela do admin (não é salvo no back). */
export type PreValidationState =
  | { status: 'loading' }
  | { status: 'done'; result: PreValidationResult }
  | { status: 'error'; message: string };

const OPINION_TITLE: Record<PreValidationOpinion, string> = {
  favoravel: 'Parecer favorável',
  desfavoravel: 'Parecer desfavorável',
  indisponivel: 'Consulta indisponível',
  'sem-api': 'Sem API pública: validação manual',
};

const OPINION_ICON: Record<PreValidationOpinion, string> = {
  favoravel: '✓',
  desfavoravel: '✕',
  indisponivel: '!',
  'sem-api': 'i',
};

@Component({
  selector: 'app-pre-validation-alert',
  standalone: true,
  imports: [DatePipe, ButtonComponent],
  templateUrl: './pre-validation-alert.component.html',
  styleUrl: './pre-validation-alert.component.scss',
})
export class PreValidationAlertComponent {
  state = input.required<PreValidationState>();

  retry = output<void>();

  protected readonly result = computed(() => {
    const state = this.state();
    return state.status === 'done' ? state.result : null;
  });

  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.message : '';
  });

  protected title(opinion: PreValidationOpinion): string {
    return OPINION_TITLE[opinion];
  }

  protected icon(opinion: PreValidationOpinion): string {
    return OPINION_ICON[opinion];
  }
}
