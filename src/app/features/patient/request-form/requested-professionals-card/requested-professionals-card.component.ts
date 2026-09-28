import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  MAX_PROFESSIONALS_PER_ROW,
  MAX_REQUESTED_PROFESSIONAL_ROWS,
  RequestedProfessionalGroup,
  buildRequestedProfessionalGroup,
} from '../../../../core/forms/requested-professional-form';
import { ProfessionalCategoryInfo, Specialty } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { CardComponent } from '../../../../shared/ui/layout/card/card.component';
import { InputComponent } from '../../../../shared/ui/forms/input/input.component';
import { MultiSelectComponent, MultiSelectOption } from '../../../../shared/ui/forms/multi-select/multi-select.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/forms/select/select.component';

type RowValue = { category: string; specialtyIds: string[]; quantity: string };

@Component({
  selector: 'app-requested-professionals-card',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, CardComponent, InputComponent, MultiSelectComponent, SelectComponent],
  templateUrl: './requested-professionals-card.component.html',
  styleUrl: './requested-professionals-card.component.scss',
})
export class RequestedProfessionalsCardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  formArray = input.required<FormArray<RequestedProfessionalGroup>>();
  categories = input.required<ProfessionalCategoryInfo[]>();
  specialties = input.required<Specialty[]>();
  /** Só visualização: esconde adicionar/remover (os campos já vêm desabilitados pelo form). */
  readOnly = input(false);

  private readonly rows = signal<RowValue[]>([]);

  protected readonly categoryOptions = computed<SelectOption[]>(() =>
    this.categories().map((category) => ({ value: category.value, label: category.label })),
  );

  /** Especialidades da categoria escolhida em cada linha. */
  protected readonly specialtyOptionsByRow = computed<MultiSelectOption[][]>(() =>
    this.rows().map((row) =>
      this.specialties()
        .filter((specialty) => specialty.category === row.category)
        .map((specialty) => ({ value: specialty.id, label: specialty.name })),
    ),
  );

  protected readonly totalProfessionals = computed(() =>
    this.rows().reduce((total, row) => total + (Number(row.quantity) || 0), 0),
  );

  protected readonly canAdd = computed(() => this.rows().length < MAX_REQUESTED_PROFESSIONAL_ROWS);

  ngOnInit(): void {
    const syncRows = () => this.rows.set(this.formArray().getRawValue());
    syncRows();
    this.formArray().valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(syncRows);
  }

  protected add(): void {
    this.formArray().push(buildRequestedProfessionalGroup(this.fb));
  }

  protected remove(index: number): void {
    this.formArray().removeAt(index);
  }

  /** As especialidades dependem da categoria: trocar a categoria limpa a escolha anterior. */
  protected onCategoryChange(index: number): void {
    this.formArray().at(index).controls.specialtyIds.setValue([]);
  }

  protected fieldError(index: number, fieldName: 'category' | 'specialtyIds' | 'quantity'): string | null {
    const control = this.formArray().at(index).controls[fieldName];

    if (!control.touched) {
      return null;
    }

    if (control.hasError('required')) {
      return fieldName === 'specialtyIds' ? 'Selecione ao menos uma especialidade.' : 'Campo obrigatório.';
    }

    if (control.hasError('pattern') || control.hasError('min') || control.hasError('max')) {
      return `De 1 a ${MAX_PROFESSIONALS_PER_ROW}.`;
    }

    return null;
  }
}
