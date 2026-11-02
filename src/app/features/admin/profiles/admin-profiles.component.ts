import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminProfileSummary, ListViewState, ProfileSituation, SwitchableRole } from '../../../core/models';
import { AdminProfileService } from '../../../core/services/admin/admin-profile.service';
import { BadgeComponent } from '../../../shared/ui/feedback/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { createPagination } from '../../../core/lists/pagination';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';

/** A fila do que chegou por demanda (menu Ocorrências). */
const SITUATIONS: FilterChip<ProfileSituation>[] = [
  { value: 'com_recurso', label: 'Com recurso' },
  { value: 'bloqueados', label: 'Bloqueados' },
  { value: 'com_ocorrencias', label: 'Com ocorrências' },
];

/**
 * `demand`: a fila de Ocorrências (recurso a decidir, ocorrências, bloqueados).
 * `all`: Gerais › Usuários, qualquer paciente ou profissional, para o admin
 * lançar ocorrência ou bloquear por conta própria.
 */
export type AdminProfilesMode = 'demand' | 'all';

const ROLES: FilterChip<SwitchableRole | null>[] = [
  { value: null, label: 'Pacientes e profissionais' },
  { value: 'patient', label: 'Pacientes' },
  { value: 'professional', label: 'Profissionais' },
];

/**
 * Perfis de pacientes e profissionais (ver {@link AdminProfilesMode}): o admin
 * entra no perfil para lançar ou anular ocorrência, decidir recurso, aplicar
 * ou remover bloqueio. O modo vem da rota (`data.mode`).
 */
@Component({
  selector: 'app-admin-profiles',
  standalone: true,
  imports: [PaginatorComponent, 
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    BadgeComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FilterChipsComponent,
    InputComponent,
    SkeletonListComponent,
  ],
  templateUrl: './admin-profiles.component.html',
  styleUrl: './admin-profiles.component.scss',
})
export class AdminProfilesComponent {
  private readonly profileService = inject(AdminProfileService);

  protected readonly mode: AdminProfilesMode = inject(ActivatedRoute).snapshot.data['mode'] ?? 'demand';
  protected readonly situations = SITUATIONS;
  protected readonly roles = ROLES;
  protected readonly situation = signal<ProfileSituation>(this.mode === 'all' ? 'todos' : 'com_ocorrencias');
  protected readonly role = signal<SwitchableRole | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly profiles = signal<AdminProfileSummary[]>([]);
  /** A lista vem paginada (5 por página por padrão). */
  protected readonly pager = createPagination(this.profiles);

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.load());
    this.load();
  }

  protected selectSituation(situation: ProfileSituation): void {
    this.situation.set(situation);
    this.load();
  }

  protected selectRole(role: SwitchableRole | null): void {
    this.role.set(role);
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.profileService
      .list({ situation: this.situation(), role: this.role() ?? undefined, search: this.search.value })
      .subscribe({
        next: (profiles) => {
          this.profiles.set(profiles);
          this.viewState.set(profiles.length ? 'filled' : 'empty');
        },
        error: () => this.viewState.set('error'),
      });
  }

  protected roleLabel(role: SwitchableRole): string {
    return role === 'patient' ? 'Paciente' : 'Profissional';
  }
}
