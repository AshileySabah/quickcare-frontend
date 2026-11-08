import { Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { formatPeriod } from '../../../../core/formatting/period';
import {
  PracticeAreaGroup,
  buildPracticeAreaGroup,
  practiceAreaKey,
  toPracticeAreaInput,
} from '../../../../core/forms/practice-area-form';
import {
  MyPracticeArea,
  PracticeAreaImpact,
  ProfessionalCategoryInfo,
  Specialty,
} from '../../../../core/models';
import { PracticeAreaService } from '../../../../core/services/practice-area.service';
import { SpecialtyService } from '../../../../core/services/specialty.service';
import { UfService } from '../../../../core/services/uf.service';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { ErrorStateComponent } from '../../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { ToastService } from '../../../../shared/ui/feedback/toast/toast.service';
import { ValidationStatusBadgeComponent } from '../../../../shared/ui/feedback/validation-status-badge/validation-status-badge.component';
import { revealFirstInvalid } from '../../../../shared/ui/forms/invalid-field-focus.directive';
import { MultiSelectComponent, MultiSelectOption } from '../../../../shared/ui/forms/multi-select/multi-select.component';
import { SelectOption } from '../../../../shared/ui/forms/select/select.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../../shared/ui/layout/card/card.component';
import { PracticeAreaFieldsComponent } from '../practice-area-fields/practice-area-fields.component';

type ViewState = 'loading' | 'error' | 'ready';

interface PendingChange {
  kind: 'remove' | 'specialties';
  area: MyPracticeArea;
  specialtyIds?: string[];
  impact: PracticeAreaImpact;
}

@Component({
  selector: 'app-practice-areas-manager',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    ConfirmDialogComponent,
    ErrorStateComponent,
    IconComponent,
    MultiSelectComponent,
    PracticeAreaFieldsComponent,
    SkeletonListComponent,
    ValidationStatusBadgeComponent,
  ],
  templateUrl: './practice-areas-manager.component.html',
  styleUrl: './practice-areas-manager.component.scss',
})
export class PracticeAreasManagerComponent implements OnInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly fb = inject(FormBuilder);
  private readonly practiceAreaService = inject(PracticeAreaService);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly ufService = inject(UfService);
  private readonly toastService = inject(ToastService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly areas = signal<MyPracticeArea[]>([]);
  protected readonly categoryOptions = signal<ProfessionalCategoryInfo[]>([]);
  protected readonly specialties = signal<Specialty[]>([]);
  protected readonly ufOptions = signal<SelectOption[]>([]);

  protected readonly editingId = signal<string | null>(null);
  protected readonly including = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly pending = signal<PendingChange | null>(null);

  protected readonly specialtiesControl = new FormControl<string[]>([], { nonNullable: true, validators: Validators.required });
  protected readonly specialtiesForm = this.fb.nonNullable.group({ specialtyIds: this.specialtiesControl });
  protected includeForm: PracticeAreaGroup = buildPracticeAreaGroup(this.fb);

  protected readonly canRemove = computed(() => this.areas().length > 1);
  protected readonly existingKeys = computed(() =>
    this.areas()
      .map(({ area }) => practiceAreaKey(area.category, area.specialties.map((specialty) => specialty.id)))
      .filter((key): key is string => key !== null),
  );

  protected readonly dialogTitle = computed(() =>
    this.pending()?.kind === 'remove' ? 'Remover atuação' : 'Alterar especialidades',
  );
  protected readonly dialogMessage = computed(() => {
    const pending = this.pending();
    if (!pending) {
      return '';
    }
    const total = pending.impact.proposals.length;
    const what = pending.kind === 'remove' ? `remover ${pending.area.area.label}` : 'tirar essas especialidades';
    return `Se você ${what}, ${total === 1 ? 'a proposta abaixo será cancelada' : `as ${total} propostas abaixo serão canceladas`}. O paciente é avisado.`;
  });
  protected readonly dialogConsequences = computed(() =>
    (this.pending()?.impact.proposals ?? []).map(
      (proposal) =>
        `${proposal.service} · ${proposal.status === 'aceita' ? 'aceita' : 'pendente'} · ${formatPeriod(proposal.startsAt, proposal.endsAt)}` +
        (proposal.createsOccurrence ? ' — conta como ocorrência para você' : ''),
    ),
  );
  protected readonly dialogWarning = computed(() =>
    this.pending()?.impact.proposals.some((proposal) => proposal.createsOccurrence)
      ? 'Cancelar atendimento aceito há mais de 48h conta como ocorrência, como em qualquer cancelamento.'
      : null,
  );
  protected readonly dialogConfirmLabel = computed(() =>
    this.pending()?.kind === 'remove' ? 'Sim, remover a atuação' : 'Sim, salvar as especialidades',
  );
  protected readonly dialogCancelLabel = computed(() =>
    this.pending()?.kind === 'remove' ? 'Não, manter a atuação' : 'Não, manter as especialidades',
  );

  ngOnInit(): void {
    this.specialtyService.listCategories().subscribe({
      next: (categories) => this.categoryOptions.set(categories),
      error: () => this.categoryOptions.set([]),
    });
    this.specialtyService.list().subscribe({
      next: (specialties) => this.specialties.set(specialties),
      error: () => this.specialties.set([]),
    });
    this.ufService.list().subscribe({
      next: (ufs) => this.ufOptions.set(ufs),
      error: () => this.ufOptions.set([]),
    });
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.practiceAreaService.list().subscribe({
      next: (areas) => {
        this.areas.set(areas);
        this.viewState.set('ready');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected specialtyNames(area: MyPracticeArea): string {
    return area.area.specialties.map((specialty) => specialty.name).join(', ');
  }

  protected specialtyOptionsFor(area: MyPracticeArea): MultiSelectOption[] {
    return this.specialties()
      .filter((specialty) => specialty.category === area.area.category)
      .map((specialty) => ({ value: specialty.id, label: specialty.name }));
  }

  protected startEditing(area: MyPracticeArea): void {
    this.including.set(false);
    this.editingId.set(area.area.id);
    this.specialtiesForm.reset({ specialtyIds: area.area.specialties.map((specialty) => specialty.id) });
  }

  protected onSpecialtiesEnter(event: Event, area: MyPracticeArea): void {
    if (this.isTextInput(event)) {
      event.preventDefault();
      this.saveSpecialties(area);
    }
  }

  protected onIncludeEnter(event: Event): void {
    if (this.isTextInput(event)) {
      event.preventDefault();
      this.include();
    }
  }

  protected saveSpecialties(area: MyPracticeArea): void {
    if (this.specialtiesForm.invalid) {
      this.specialtiesForm.markAllAsTouched();
      this.revealInvalid();
      return;
    }
    const specialtyIds = this.specialtiesControl.value;
    this.busyId.set(area.area.id);
    this.practiceAreaService.impact(area.area.id, specialtyIds).subscribe({
      next: (impact) => {
        this.busyId.set(null);
        this.decide({ kind: 'specialties', area, specialtyIds, impact });
      },
      error: (error: Error) => this.fail(error),
    });
  }

  protected askToRemove(area: MyPracticeArea): void {
    this.busyId.set(area.area.id);
    this.practiceAreaService.impact(area.area.id).subscribe({
      next: (impact) => {
        this.busyId.set(null);
        this.decide({ kind: 'remove', area, impact });
      },
      error: (error: Error) => this.fail(error),
    });
  }

  protected confirmPending(): void {
    const pending = this.pending();
    if (pending) {
      this.apply(pending);
    }
  }

  private isTextInput(event: Event): boolean {
    return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  }

  private revealInvalid(): void {
    afterNextRender(() => revealFirstInvalid(this.host.nativeElement), { injector: this.injector });
  }

  protected startIncluding(): void {
    this.editingId.set(null);
    this.includeForm = buildPracticeAreaGroup(this.fb);
    this.including.set(true);
  }

  protected include(): void {
    if (this.includeForm.invalid) {
      this.includeForm.markAllAsTouched();
      this.revealInvalid();
      return;
    }
    this.isSaving.set(true);
    this.practiceAreaService.include(toPracticeAreaInput(this.includeForm)).subscribe({
      next: (areas) => {
        this.isSaving.set(false);
        this.including.set(false);
        this.areas.set(areas);
        this.toastService.success('Atuação incluída. O registro dela vai para a validação do administrador.');
      },
      error: (error: Error) => {
        this.isSaving.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private decide(change: PendingChange): void {
    if (!change.impact.allowed) {
      this.toastService.error(change.impact.blocker ?? 'Esta alteração não pode ser feita agora.');
      return;
    }
    if (change.impact.proposals.length === 0) {
      this.apply(change);
      return;
    }
    this.pending.set(change);
  }

  private apply(change: PendingChange): void {
    this.isSaving.set(true);
    const request$ =
      change.kind === 'remove'
        ? this.practiceAreaService.remove(change.area.area.id)
        : this.practiceAreaService.updateSpecialties(change.area.area.id, change.specialtyIds ?? []);

    request$.subscribe({
      next: (areas) => {
        this.isSaving.set(false);
        this.pending.set(null);
        this.editingId.set(null);
        this.areas.set(areas);
        this.toastService.success(change.kind === 'remove' ? 'Atuação removida.' : 'Especialidades atualizadas.');
      },
      error: (error: Error) => {
        this.isSaving.set(false);
        this.pending.set(null);
        this.toastService.error(error.message);
      },
    });
  }

  private fail(error: Error): void {
    this.busyId.set(null);
    this.toastService.error(error.message);
  }
}
