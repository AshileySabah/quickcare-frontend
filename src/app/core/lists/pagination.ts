import { Signal, computed, linkedSignal, signal } from '@angular/core';

/** Quantos itens por página dá para escolher (múltiplos de 5); o primeiro é o padrão. */
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50] as const;

export interface Pagination<T> {
  /** Página atual, começando em 1. */
  readonly page: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly total: Signal<number>;
  readonly totalPages: Signal<number>;
  /** Os itens da página atual. */
  readonly items: Signal<T[]>;
  /** Posição (1-based) do primeiro e do último item da página, para "Mostrando 6–10 de 23". */
  readonly range: Signal<{ from: number; to: number }>;
  setPage(page: number): void;
  setPageSize(size: number): void;
}

/**
 * Paginação sobre uma lista já carregada (filtrada ou não). Volta para a
 * página 1 quando a quantidade de itens muda (outro filtro, outra busca) e ao
 * trocar o tamanho da página; atualizar um item no lugar (ex.: depois de uma
 * ação) mantém a página. A página nunca passa da última que existe.
 */
export function createPagination<T>(source: Signal<T[]>, initialSize: number = PAGE_SIZE_OPTIONS[0]): Pagination<T> {
  const pageSize = signal(initialSize);
  const total = computed(() => source().length);
  const requestedPage = linkedSignal<number, number>({ source: total, computation: () => 1 });

  const totalPages = computed(() => Math.max(1, Math.ceil(total() / pageSize())));
  const page = computed(() => Math.min(Math.max(requestedPage(), 1), totalPages()));
  const items = computed(() => {
    const start = (page() - 1) * pageSize();
    return source().slice(start, start + pageSize());
  });
  const range = computed(() => {
    if (total() === 0) {
      return { from: 0, to: 0 };
    }
    const from = (page() - 1) * pageSize() + 1;
    return { from, to: Math.min(from + pageSize() - 1, total()) };
  });

  return {
    page,
    pageSize,
    total,
    totalPages,
    items,
    range,
    setPage: (value) => requestedPage.set(value),
    setPageSize: (size) => {
      pageSize.set(size);
      requestedPage.set(1);
    },
  };
}

/**
 * As páginas a mostrar como botões: a primeira, a última e as vizinhas da
 * atual; o resto vira reticências (`null`). Ex.: 1 … 4 5 6 … 12.
 */
export function visiblePages(current: number, totalPages: number): (number | null)[] {
  const pages = new Set([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (const page of sorted) {
    const previous = result[result.length - 1];
    if (typeof previous === 'number' && page - previous > 1) {
      result.push(null);
    }
    result.push(page);
  }
  return result;
}
