import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../feedback/avatar/avatar.component';

/**
 * Avatar e nome de uma pessoa (paciente ou profissional). Com `link`, vira
 * atalho para o perfil dela; sem, é só identificação.
 */
@Component({
  selector: 'ui-person-chip',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, AvatarComponent],
  templateUrl: './person-chip.component.html',
  styleUrl: './person-chip.component.scss',
})
export class PersonChipComponent {
  name = input.required<string>();
  avatarUrl = input<string | undefined>(undefined);
  /** Linha de apoio abaixo do nome (ex.: "Paciente"). */
  caption = input<string | null>(null);
  link = input<string | unknown[] | null>(null);
}
