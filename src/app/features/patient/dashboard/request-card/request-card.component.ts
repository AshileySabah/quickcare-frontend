import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServiceRequest, requestedSpecialtyNames } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../../shared/ui/feedback/badge/badge.component';
import { StatusBadgeComponent } from '../../../../shared/ui/feedback/status-badge/status-badge.component';
import { CardComponent } from '../../../../shared/ui/layout/card/card.component';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const URGENT_DEADLINE_DAYS = 3;
const ACTIVE_STATUSES = ['aberta', 'recebendo_propostas', 'em_andamento'];

/** Dias de hoje até o dia da data, no fuso local. Negativo = já passou. */
function daysFromToday(date: Date): number {
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  return Math.round((startOfDay(date) - startOfDay(new Date())) / MS_PER_DAY);
}

/** "yyyy-MM-dd" como data local (new Date("yyyy-MM-dd") seria meia-noite UTC). */
function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

@Component({
  selector: 'app-request-card',
  standalone: true,
  imports: [DatePipe, RouterLink, BadgeComponent, ButtonComponent, CardComponent, StatusBadgeComponent],
  templateUrl: './request-card.component.html',
  styleUrl: './request-card.component.scss',
})
export class RequestCardComponent {
  request = input.required<ServiceRequest>();
  /** Quantos profissionais já enviaram proposta. */
  proposalCount = input(0);
  canEdit = input(false);
  canCancel = input(false);

  cancel = output<ServiceRequest>();

  protected readonly specialtyNames = requestedSpecialtyNames;

  protected readonly formLink = computed(() => ['/patient/solicitacoes', this.request().id, 'editar']);
  protected readonly proposalsLink = computed(() => ['/patient/solicitacoes', this.request().id]);

  protected readonly totalRequested = computed(() =>
    this.request().professionals.reduce((total, professional) => total + professional.quantity, 0),
  );

  protected readonly createdHint = computed(() => {
    const days = -daysFromToday(new Date(this.request().createdAt));
    if (days <= 0) return 'hoje';
    if (days === 1) return 'ontem';
    return `há ${days} dias`;
  });

  private readonly daysToDeadline = computed(() => daysFromToday(parseLocalDate(this.request().desiredDeadline)));

  protected readonly deadlineHint = computed(() => {
    const days = this.daysToDeadline();
    if (days === 0) return 'vence hoje';
    if (days === 1) return 'vence amanhã';
    if (days > 1) return `em ${days} dias`;
    return days === -1 ? 'venceu ontem' : `venceu há ${-days} dias`;
  });

  /** Só destaca o prazo enquanto a solicitação ainda está ativa. */
  protected readonly deadlineUrgent = computed(
    () => ACTIVE_STATUSES.includes(this.request().status) && this.daysToDeadline() <= URGENT_DEADLINE_DAYS,
  );
}
