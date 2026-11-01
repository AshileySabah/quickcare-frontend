import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { addressFieldErrorsFor, buildAddressGroup } from '../../../core/forms/address-form';
import { fieldErrorsFor } from '../../../core/forms/field-errors';
import { buildRequestedProfessionalGroup } from '../../../core/forms/requested-professional-form';
import { ProfessionalCategory, ProfessionalCategoryInfo, ServiceRequest, Specialty } from '../../../core/models';
import { RequestService } from '../../../core/services/request.service';
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

type Modality = 'online' | 'presencial';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [SkeletonListComponent, 
    ReactiveFormsModule,
    AddressCardComponent,
    ButtonComponent,
    CardComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    RequestedProfessionalsCardComponent,
    RouterLink,
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

  private readonly editingId = this.route.snapshot.paramMap.get('id');

  protected readonly isEditMode = this.editingId !== null;
  protected readonly isLoading = signal(this.isEditMode);
  protected readonly isSubmitting = signal(false);
  /** Solicitação que já não pode ser editada (em andamento, concluída...) abre só para visualização. */
  protected readonly readOnlyRequest = signal<ServiceRequest | null>(null);

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
    // Só é validado (habilitado) quando a modalidade é presencial.
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
    }
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

    // getRawValue: o address-card desabilita os campos preenchidos pelo CEP.
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
