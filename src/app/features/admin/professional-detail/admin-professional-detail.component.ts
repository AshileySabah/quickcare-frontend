import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Professional, ProfessionalCategoryInfo, Specialty } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/error-state/error-state.component';
import { GridItemComponent } from '../../../shared/ui/grid/grid-item.component';
import { GridComponent } from '../../../shared/ui/grid/grid.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { TextareaComponent } from '../../../shared/ui/textarea/textarea.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

type PageState = 'loading' | 'error' | 'not-found' | 'filled';

@Component({
  selector: 'app-admin-professional-detail',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    GridComponent,
    GridItemComponent,
    ModalComponent,
    SkeletonComponent,
    TextareaComponent,
  ],
  templateUrl: './admin-professional-detail.component.html',
  styleUrl: './admin-professional-detail.component.scss',
})
export class AdminProfessionalDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly specialtyService = inject(SpecialtyService);

  private readonly professionalId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly pageState = signal<PageState>('loading');
  protected readonly professional = signal<Professional | null>(null);
  protected readonly isProcessing = signal(false);
  protected readonly isRejectModalOpen = signal(false);
  private readonly specialties = signal<Specialty[]>([]);
  private readonly categories = signal<ProfessionalCategoryInfo[]>([]);

  protected readonly rejectForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(10)]],
  });

  constructor() {
    this.specialtyService.list().subscribe((specialties) => this.specialties.set(specialties));
    this.specialtyService.listCategories().subscribe((categories) => this.categories.set(categories));
    this.load();
  }

  protected load(): void {
    this.pageState.set('loading');

    this.authService.getProfessionalById(this.professionalId).subscribe({
      next: (professional) => {
        if (!professional) {
          this.pageState.set('not-found');
          return;
        }

        this.professional.set(professional);
        this.pageState.set('filled');
      },
      error: () => this.pageState.set('error'),
    });
  }

  protected specialtyName(specialtyId: string): string {
    return this.specialties().find((specialty) => specialty.id === specialtyId)?.name ?? specialtyId;
  }

  protected categoryLabel(professional: Professional): string {
    return this.categories().find((category) => category.value === professional.category)?.label ?? professional.category;
  }

  protected registrationLabel(professional: Professional): string {
    return (
      this.categories().find((category) => category.value === professional.category)?.registrationLabel ??
      'Registro profissional'
    );
  }

  protected canPreviewAsImage(professional: Professional): boolean {
    return (
      professional.validationDocument.fileType.startsWith('image/') &&
      professional.validationDocument.previewUrl.startsWith('blob:')
    );
  }

  protected approve(): void {
    this.isProcessing.set(true);

    this.authService.approveProfessional(this.professionalId).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.toastService.success('Profissional aprovado com sucesso!');
        this.router.navigateByUrl('/admin');
      },
      error: (error: Error) => {
        this.isProcessing.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  protected openRejectModal(): void {
    this.isRejectModalOpen.set(true);
  }

  protected closeRejectModal(): void {
    this.isRejectModalOpen.set(false);
  }

  protected rejectReasonError(): string | null {
    const control = this.rejectForm.controls.reason;

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Informe o motivo da reprovação.';
    }

    if (control.hasError('minlength')) {
      return 'Descreva o motivo com mais detalhes (mínimo 10 caracteres).';
    }

    return null;
  }

  protected reject(): void {
    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    const { reason } = this.rejectForm.getRawValue();

    this.isProcessing.set(true);

    this.authService.rejectProfessional(this.professionalId, reason).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.isRejectModalOpen.set(false);
        this.toastService.success('Profissional reprovado.');
        this.router.navigateByUrl('/admin');
      },
      error: (error: Error) => {
        this.isProcessing.set(false);
        this.toastService.error(error.message);
      },
    });
  }
}
