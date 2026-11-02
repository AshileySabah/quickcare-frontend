import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

const SITUATIONS: FilterChip<ProfileSituation>[] = [
  { value: 'com_recurso', label: 'Com recurso' },
  { value: 'bloqueados', label: 'Bloqueados' },
  { value: 'com_ocorrencias', label: 'Com ocorrências' },
  { value: 'todos', label: 'Todos' },
];

const ROLES: FilterChip<SwitchableRole | null>[] = [
  { value: null, label: 'Pacientes e profissionais' },
  { value: 'patient', label: 'Pacientes' },
  { value: 'professional', label: 'Profissionais' },
];

/** Perfis com ocorrências e bloqueios: o admin entra para lançar, anular ou desbloquear. */
@Component({
  selector: 'app-admin-profiles',
  standalone: true,
  imports: [
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

  protected readonly situations = SITUATIONS;
  protected readonly roles = ROLES;
  protected readonly situation = signal<ProfileSituation>('com_ocorrencias');
  protected readonly role = signal<SwitchableRole | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });

  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly profiles = signal<AdminProfileSummary[]>([]);

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
