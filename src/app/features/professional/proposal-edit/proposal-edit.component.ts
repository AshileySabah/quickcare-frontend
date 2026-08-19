import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProposalService } from '../../../core/services/proposal.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/input/input.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { TextareaComponent } from '../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

type FieldName = 'price' | 'approach' | 'deadline';

@Component({
  selector: 'app-proposal-edit',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, SkeletonComponent, TextareaComponent],
  templateUrl: './proposal-edit.component.html',
  styleUrl: './proposal-edit.component.scss',
})
export class ProposalEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  private readonly proposalId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    price: ['', [Validators.required, Validators.min(1)]],
    approach: ['', [Validators.required, Validators.minLength(20)]],
    deadline: ['', Validators.required],
  });

  constructor() {
    this.proposalService.getById(this.proposalId).subscribe({
      next: (proposal) => {
        if (!proposal || !this.proposalService.canEdit(proposal)) {
          this.toastService.error('Esta proposta não pode mais ser editada.');
          this.router.navigateByUrl('/professional/propostas');
          return;
        }

        this.form.patchValue({
          price: String(proposal.price),
          approach: proposal.approach,
          deadline: proposal.deadline,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Não foi possível carregar a proposta.');
        this.router.navigateByUrl('/professional/propostas');
      },
    });
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

    const { price, approach, deadline } = this.form.getRawValue();

    this.isSubmitting.set(true);

    this.proposalService.update(this.proposalId, { price: Number(price), approach, deadline }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success('Proposta atualizada com sucesso!');
        this.router.navigateByUrl('/professional/propostas');
      },
      error: (error: Error) => {
        this.isSubmitting.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
