import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { ProfessionalCategory, ProfessionalCategoryInfo, PublicModality, PublicSearchFilters, Specialty } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { UfService } from '../../../core/services/uf.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';

@Component({
  selector: 'app-public-filters',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './public-filters.component.html',
  styleUrl: './public-filters.component.scss',
})
export class PublicFiltersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly ufService = inject(UfService);
  private readonly destroyRef = inject(DestroyRef);

  showRating = input(false);

  readonly changed = output<PublicSearchFilters>();

  protected readonly form = this.fb.nonNullable.group({
    category: [''],
    specialtyId: [''],
    city: [''],
    state: [''],
    modality: [''],
    minRating: [''],
  });

  protected readonly categories = signal<ProfessionalCategoryInfo[]>([]);
  private readonly specialties = signal<Specialty[]>([]);
  protected readonly ufOptions = signal<SelectOption[]>([]);
  private readonly category = toSignal(this.form.controls.category.valueChanges, { initialValue: '' });

  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((category) => ({ value: category.value, label: category.label })),
  );
  protected readonly specialtyOptions = computed<SelectOption[]>(() =>
    this.specialties()
      .filter((specialty) => !this.category() || specialty.category === this.category())
      .map((specialty) => ({ value: specialty.id, label: specialty.name })),
  );
  protected readonly modalityOptions: SelectOption[] = [
    { value: 'presencial', label: 'Presencial' },
    { value: 'online', label: 'Online' },
  ];
  protected readonly ratingOptions: SelectOption[] = [
    { value: '3', label: '3 estrelas ou mais' },
    { value: '4', label: '4 estrelas ou mais' },
    { value: '4.5', label: '4,5 estrelas ou mais' },
  ];

  ngOnInit(): void {
    this.specialtyService.listCategories().subscribe({ next: (categories) => this.categories.set(categories) });
    this.specialtyService.list().subscribe({ next: (specialties) => this.specialties.set(specialties) });
    this.ufService.list().subscribe({ next: (ufs) => this.ufOptions.set(ufs) });

    this.form.controls.category.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.controls.specialtyId.reset('', { emitEvent: false }));
    this.form.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.emit());
  }

  protected clear(): void {
    this.form.reset({ category: '', specialtyId: '', city: '', state: '', modality: '', minRating: '' });
  }

  private emit(): void {
    const value = this.form.getRawValue();
    this.changed.emit({
      category: (value.category || undefined) as ProfessionalCategory | undefined,
      specialtyId: value.specialtyId || undefined,
      city: value.city.trim() || undefined,
      state: value.state || undefined,
      modality: (value.modality || undefined) as PublicModality | undefined,
      minRating: value.minRating ? Number(value.minRating) : undefined,
    });
  }
}
