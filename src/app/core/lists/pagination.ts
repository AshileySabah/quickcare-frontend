import { Signal, computed, linkedSignal, signal } from '@angular/core';

export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50] as const;

export interface Pagination<T> {
  readonly page: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly total: Signal<number>;
  readonly totalPages: Signal<number>;
  readonly items: Signal<T[]>;
  readonly range: Signal<{ from: number; to: number }>;
  setPage(page: number): void;
  setPageSize(size: number): void;
}

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
