import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { addressFieldErrorsFor, buildAddressGroup } from '../../../core/forms/address-form';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { buildRequestedProfessionalGroup } from '../../../core/forms/requested-professional-form';
import { ProfessionalCategory, ProfessionalCategoryInfo, ServiceRequest, Specialty } from '../../../core/models';
import { RequestService, hasAcceptedProposals, isLateChange } from '../../../core/services/request.service';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { GridItemComponent } from '../../../shared/ui/layout/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/layout/grid/grid.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { StatusBadgeComponent } from '../../../shared/ui/feedback/status-badge/status-badge.component';
import { TextareaComponent } from '../../../shared/ui/forms/textarea/textarea.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { AddressCardComponent } from '../../../shared/ui/register/address-card/address-card.component';
import { RequestedProfessionalsCardComponent } from './requested-professionals-card/requested-professionals-card.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { BackLinkComponent } from '../../../shared/ui/back-link/back-link.component';
import { NoticeComponent } from '../../../shared/ui/feedback/notice/notice.component';
import { CreationLockService } from '../../../core/services/creation-lock.service';
import { BlockedNoticeComponent } from '../../occurrences/blocked-notice/blocked-notice.component';
import { InvalidFieldFocusDirective } from '../../../shared/ui/forms/invalid-field-focus.directive';

type Modality = 'online' | 'presencial';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [InvalidFieldFocusDirective, BlockedNoticeComponent, NoticeComponent, BackLinkComponent, SkeletonListComponent, 
    ReactiveFormsModule,
    AddressCardComponent,
    ButtonComponent,
    CardComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    RequestedProfessionalsCardComponent,
    SelectComponent,
    StatusBadgeComponent,
    TextareaComponent,
  ],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss',
})
export class RequestFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly requestService = inject(RequestService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  private readonly specialtyService = inject(SpecialtyService);
  protected readonly blocked = inject(CreationLockService).lockFor('patient');

  private readonly editingId = this.route.snapshot.paramMap.get('id');
  private readonly baseId = this.editingId ? null : this.route.snapshot.queryParamMap.get('baseadaEm');

  protected readonly isEditMode = this.editingId !== null;
  protected readonly isCopy = this.baseId !== null;
  protected readonly isLoading = signal(this.isEditMode || this.isCopy);
  protected readonly isSubmitting = signal(false);
  protected readonly readOnlyRequest = signal<ServiceRequest | null>(null);
  protected readonly hasAcceptedProposals = signal(false);
  protected readonly lateChange = signal(false);

  protected readonly categories = signal<ProfessionalCategoryInfo[]>([]);
  protected readonly specialties = signal<Specialty[]>([]);

  protected readonly modalityOptions: SelectOption[] = [
    { value: 'online', label: 'Online' },
    { value: 'presencial', label: 'Presencial' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    professionals: this.fb.array([buildRequestedProfessionalGroup(this.fb)]),
    description: ['', [Validators.required, Validators.minLength(20)]],
    modality: ['online' as Modality, Validators.required],
    desiredDeadline: ['', Validators.required],
    address: buildAddressGroup(this.fb),
  });

  protected readonly fieldError = fieldErrorsFor(this.form, {
    description: { minlength: 'Descreva com mais detalhes (mínimo 20 caracteres).' },
  });
  protected readonly addressFieldError = addressFieldErrorsFor(this.form.controls.address);

  constructor() {
    this.form.controls.address.disable();

    this.specialtyService.list().subscribe({
      next: (specialties) => this.specialties.set(specialties),
      error: () =>
        this.toastService.error('Não foi possível carregar as especialidades. Recarregue a página e tente novamente.'),
    });

    this.specialtyService.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () =>
        this.toastService.error('Não foi possível carregar as categorias. Recarregue a página e tente novamente.'),
    });

    this.form.controls.modality.valueChanges.subscribe((modality) => this.toggleAddress(modality));

    if (this.editingId) {
      this.loadRequestToEdit(this.editingId);
    } else if (this.baseId) {
      this.loadRequestToCopy(this.baseId);
    }
  }

  private loadRequestToCopy(id: string): void {
    const fail = () => this.toastService.error('Não foi possível copiar a solicitação. Preencha os dados.');

    this.requestService.getById(id).subscribe({
      next: (request) => {
        if (request) {
          this.fillForm(request);
          this.form.controls.desiredDeadline.reset('');
        } else {
          fail();
        }
        this.isLoading.set(false);
      },
      error: () => {
        fail();
        this.isLoading.set(false);
      },
    });
  }

  private loadRequestToEdit(id: string): void {
    this.requestService.getById(id).subscribe({
      next: (request) => {
        if (!request) {
          this.toastService.error('Solicitação não encontrada.');
          this.router.navigateByUrl('/patient');
          return;
        }

        this.fillForm(request);
        this.hasAcceptedProposals.set(hasAcceptedProposals(request));
        this.lateChange.set(isLateChange(request));

        if (!this.requestService.canEdit(request)) {
          this.readOnlyRequest.set(request);
          this.form.disable();
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Não foi possível carregar a solicitação.');
        this.router.navigateByUrl('/patient');
      },
    });
  }

  private fillForm(request: ServiceRequest): void {
    const professionals = this.form.controls.professionals;
    professionals.clear();
    for (const professional of request.professionals) {
      professionals.push(
        buildRequestedProfessionalGroup(this.fb, {
          category: professional.category,
          specialtyIds: professional.specialties.map((specialty) => specialty.id),
          quantity: professional.quantity,
        }),
      );
    }

    this.form.patchValue({
      description: request.description,
      modality: request.modality,
      desiredDeadline: request.desiredDeadline,
    });

    if (request.address) {
      this.form.controls.address.patchValue({ ...request.address, complement: request.address.complement ?? '' });
    }
  }

  private toggleAddress(modality: Modality): void {
    if (modality === 'presencial') {
      this.form.controls.address.enable();
    } else {
      this.form.controls.address.disable();
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { professionals, description, modality, desiredDeadline, address } = this.form.getRawValue();
    const input = {
      professionals: professionals.map((professional) => ({
        category: professional.category as ProfessionalCategory,
        specialtyIds: professional.specialtyIds,
        quantity: Number(professional.quantity),
      })),
      description,
      modality,
      desiredDeadline,
      address: modality === 'presencial' ? { ...address, state: address.state.toUpperCase() } : undefined,
    };

    this.isSubmitting.set(true);

    const request$ = this.editingId ? this.requestService.update(this.editingId, input) : this.requestService.create(input);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success(this.editingId ? 'Solicitação atualizada com sucesso!' : 'Solicitação criada com sucesso!');
        this.router.navigateByUrl('/patient');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
