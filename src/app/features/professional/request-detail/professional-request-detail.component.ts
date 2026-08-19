import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ProposalService } from '../../../core/services/proposal.service';
import { RequestService } from '../../../core/services/request.service';
import { Professional, Proposal, ServiceRequest } from '../../../core/models';
import { SPECIALTIES_MOCK } from '../../../mocks';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { TextareaComponent } from '../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';
type FieldName = 'price' | 'approach' | 'deadline';

@Component({
  selector: 'app-professional-request-detail',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    InputComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    TextareaComponent,
  ],
  templateUrl: './professional-request-detail.component.html',
  styleUrl: './professional-request-detail.component.scss',
})
export class ProfessionalRequestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);

  private readonly requestId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly request = signal<ServiceRequest | null>(null);
  protected readonly existingProposal = signal<Proposal | null>(null);
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    price: ['', [Validators.required, Validators.min(1)]],
    approach: ['', [Validators.required, Validators.minLength(20)]],
    deadline: ['', Validators.required],
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.pageState.set('loading');

    this.requestService.getById(this.requestId).subscribe({
      next: (request) => {
        if (!request) {
          this.pageState.set('not-found');
          return;
        }

        this.request.set(request);

        const professionalId = this.authService.currentUser()?.id;

        this.proposalService.listForRequest(this.requestId).subscribe({
          next: (proposals) => {
            this.existingProposal.set(
              proposals.find((proposal) => proposal.professionalId === professionalId) ?? null,
            );
            this.pageState.set('filled');
          },
          error: () => this.pageState.set('error'),
        });
      },
      error: () => this.pageState.set('error'),
    });
  }

  protected specialtyName(specialtyId: string): string {
    return SPECIALTIES_MOCK.find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId;
  }

  protected fieldError(fieldName: FieldName): string | null {
    const control = this.form.controls[fieldName];

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Campo obrigatório.';
    }

    if (fieldName === 'price' && control.hasError('min')) {
      return 'Informe um valor válido.';
    }

    if (fieldName === 'approach' && control.hasError('minlength')) {
      return 'Descreva sua abordagem com mais detalhes (mínimo 20 caracteres).';
    }

    return null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.request();
    const professional = this.authService.currentUser() as Professional | null;

    if (!request || !professional) {
      return;
    }

    const { price, approach, deadline } = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.proposalService.submit({ request, professional, price: Number(price), approach, deadline }).subscribe({
      next: (proposal) => {
        this.isSubmitting.set(false);
        this.existingProposal.set(proposal);
        this.toastService.success('Proposta enviada com sucesso!');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
