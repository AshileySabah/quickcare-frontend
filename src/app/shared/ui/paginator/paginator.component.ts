import { Component, ElementRef, computed, effect, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PAGE_SIZE_OPTIONS, Pagination, visiblePages } from '../../../core/lists/pagination';
import { SelectComponent, SelectOption } from '../forms/select/select.component';

@Component({
  selector: 'ui-paginator',
  standalone: true,
  imports: [ReactiveFormsModule, SelectComponent],
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss',
})
export class PaginatorComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  pagination = input.required<Pagination<any>>();
  label = input('Paginação');

  protected readonly sizeOptions: SelectOption[] = PAGE_SIZE_OPTIONS.map((size) => ({
    value: String(size),
    label: String(size),
  }));
  protected readonly sizeControl = new FormControl(String(PAGE_SIZE_OPTIONS[0]), { nonNullable: true });

  protected readonly pages = computed(() =>
    visiblePages(this.pagination().page(), this.pagination().totalPages()),
  );

  constructor() {
    effect(() => {
      const size = String(this.pagination().pageSize());
      untracked(() => this.sizeControl.setValue(size, { emitEvent: false }));
    });
    this.sizeControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((size) => this.pagination().setPageSize(Number(size)));

  }

  protected goTo(page: number): void {
    const pagination = this.pagination();
    if (page < 1 || page > pagination.totalPages() || page === pagination.page()) {
      return;
    }
    pagination.setPage(page);
    this.scrollToListStart();
  }

  private scrollToListStart(): void {
    const list = this.host.nativeElement.previousElementSibling;
    if (list && list.getBoundingClientRect().top < 0) {
      list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
