import { Component, ElementRef, computed, effect, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PAGE_SIZE_OPTIONS, Pagination, visiblePages } from '../../../core/lists/pagination';
import { SelectComponent, SelectOption } from '../forms/select/select.component';

/**
 * Rodapé de uma lista paginada ({@link createPagination}): quantos por página
 * (5, 10, 15...), a navegação entre páginas e "Mostrando 6–10 de 23".
 * Aparece sempre, logo depois da lista, mesmo com uma página só (aí a
 * navegação fica desabilitada). Ao trocar de página, rola de volta ao começo
 * da lista (o elemento logo antes do paginador).
 */
@Component({
  selector: 'ui-paginator',
  standalone: true,
  imports: [ReactiveFormsModule, SelectComponent],
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss',
})
export class PaginatorComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** `any`: o componente só navega; o tipo dos itens fica com quem cria a paginação. */
  pagination = input.required<Pagination<any>>();
  /** Para leitores de tela: "Páginas de solicitações". */
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
    // O select acompanha o tamanho atual (a mesma paginação pode vir de fora já ajustada).
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

  /** Só sobe se o começo da lista ficou para cima da tela. */
  private scrollToListStart(): void {
    const list = this.host.nativeElement.previousElementSibling;
    if (list && list.getBoundingClientRect().top < 0) {
      list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
