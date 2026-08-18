import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RequestService } from '../../../core/services/request.service';
import { SPECIALTIES_MOCK } from '../../../mocks';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/select/select.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { TextareaComponent } from '../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

type Modality = 'online' | 'presencial';
type FieldName = 'specialtyId' | 'description' | 'modality' | 'street' | 'city' | 'state' | 'desiredDeadline';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, SelectComponent, SkeletonComponent, TextareaComponent],
  templateUrl: './request-form.component.html',
  styleUrl: './request-form.component.scss',
})
export class RequestFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  private readonly editingId = this.route.snapshot.paramMap.get('id');

  protected readonly isEditMode = this.editingId !== null;
  protected readonly isLoading = signal(this.isEditMode);
  protected readonly isSubmitting = signal(false);

  protected readonly specialtyOptions: SelectOption[] = SPECIALTIES_MOCK.map((specialty) => ({
    value: specialty.id,
    label: specialty.name,
  }));

  protected readonly modalityOptions: SelectOption[] = [
    { value: 'online', label: 'Online' },
    { value: 'presencial', label: 'Presencial' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    specialtyId: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(20)]],
    modality: ['online' as Modality, Validators.required],
    street: [''],
    city: [''],
    state: [''],
    desiredDeadline: ['', Validators.required],
  });

  constructor() {
    this.form.controls.modality.valueChanges.subscribe((modality) => this.applyModalityValidators(modality));

    if (this.editingId) {
      this.loadRequestToEdit(this.editingId);
    }
  }

  private loadRequestToEdit(id: string): void {
    this.requestService.getById(id).subscribe({
      next: (request) => {
        if (!request || !this.requestService.canEdit(request)) {
          this.toastService.error('Esta solicitação não pode mais ser editada.');
          this.router.navigateByUrl(`/patient/solicitacoes/${id}`);
          return;
        }

        this.form.patchValue({
          specialtyId: request.specialtyId,
          description: request.description,
          modality: request.modality,
          street: request.address?.street ?? '',
          city: request.address?.city ?? '',
          state: request.address?.state ?? '',
          desiredDeadline: request.desiredDeadline,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Não foi possível carregar a solicitação.');
        this.router.navigateByUrl('/patient/historico');
      },
    });
  }

  private applyModalityValidators(modality: Modality): void {
    const streetControl = this.form.controls.street;
    const cityControl = this.form.controls.city;
    const stateControl = this.form.controls.state;

    if (modality === 'presencial') {
      streetControl.setValidators(Validators.required);
      cityControl.setValidators(Validators.required);
      stateControl.setValidators(Validators.required);
    } else {
      streetControl.clearValidators();
      cityControl.clearValidators();
      stateControl.clearValidators();
      streetControl.setValue('');
      cityControl.setValue('');
      stateControl.setValue('');
    }

    streetControl.updateValueAndValidity();
    cityControl.updateValueAndValidity();
    stateControl.updateValueAndValidity();
  }

  protected fieldError(fieldName: FieldName): string | null {
    const control = this.form.controls[fieldName];

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (fieldName === 'description' && control.hasError('minlength')) {
      return 'Descreva com mais detalhes (mínimo 20 caracteres).';
    }

    return null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { specialtyId, description, modality, street, city, state, desiredDeadline } = this.form.getRawValue();
    const address = modality === 'presencial' ? { street, city, state } : undefined;

    this.isSubmitting.set(true);

    if (this.editingId) {
      this.requestService
        .update(this.editingId, { specialtyId, description, modality, address, desiredDeadline })
        .subscribe({
          next: (request) => {
            this.isSubmitting.set(false);
            this.toastService.success('Solicitação atualizada com sucesso!');
            this.router.navigateByUrl(`/patient/solicitacoes/${request.id}`);
          },
          error: (error: Error) => {
            this.isSubmitting.set(false);
            this.toastService.error(error.message);
          },
        });
      return;
    }

    const patientId = this.authService.currentUser()?.id;

    if (!patientId) {
      return;
    }

    this.requestService.create({ patientId, specialtyId, description, modality, address, desiredDeadline }).subscribe({
      next: (request) => {
        this.isSubmitting.set(false);
        this.toastService.success('Solicitação criada com sucesso!');
        this.router.navigateByUrl(`/patient/solicitacoes/${request.id}`);
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
