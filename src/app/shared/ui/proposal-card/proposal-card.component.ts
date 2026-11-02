import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { CardComponent } from '../layout/card/card.component';
import { NoticeComponent } from '../feedback/notice/notice.component';
import { PersonChipComponent } from '../person-chip/person-chip.component';
import { StatusBadgeComponent } from '../feedback/status-badge/status-badge.component';
import { Proposal } from '../../../core/models';

/**
 * Card da proposta. No topo vai a outra parte (o profissional, para o
 * paciente; o paciente, para o profissional), com link para o perfil dela.
 */
@Component({
  selector: 'ui-proposal-card',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, CardComponent, NoticeComponent, PersonChipComponent, StatusBadgeComponent],
  templateUrl: './proposal-card.component.html',
  styleUrl: './proposal-card.component.scss',
})
export class ProposalCardComponent {
  proposal = input.required<Proposal>();
  /** Sem nome, o topo do card não mostra ninguém (paciente ainda não revelado). */
  personName = input<string | undefined>(undefined);
  personAvatarUrl = input<string | undefined>(undefined);
  /** Perfil da pessoa; sem link quem vê não tem acesso a ele. */
  personLink = input<string | unknown[] | null>(null);
  /** Mostrado no lugar da pessoa enquanto ela não é revelada. */
  personHiddenNote = input<string | null>(null);
  subtitle = input<string | null>(null);
  /** Destaque acima do valor (ex.: a proposta voltou a aguardar aceite). */
  notice = input<string | null>(null);
}
