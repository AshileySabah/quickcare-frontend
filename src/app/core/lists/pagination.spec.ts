import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createPagination, visiblePages } from './pagination';

describe('pagination', () => {
  const items = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

  it('mostra 5 por padrão e passa de página', () => {
    TestBed.runInInjectionContext(() => {
      const pager = createPagination(signal(items(12)));

      expect(pager.items()).toEqual([1, 2, 3, 4, 5]);
      expect(pager.totalPages()).toBe(3);

      pager.setPage(3);
      expect(pager.items()).toEqual([11, 12]);
      expect(pager.range()).toEqual({ from: 11, to: 12 });
    });
  });

  it('trocar o tamanho volta para a primeira página', () => {
    TestBed.runInInjectionContext(() => {
      const pager = createPagination(signal(items(30)));
      pager.setPage(4);

      pager.setPageSize(10);

      expect(pager.page()).toBe(1);
      expect(pager.items().length).toBe(10);
      expect(pager.totalPages()).toBe(3);
    });
  });

  it('a lista mudou (filtro): volta para a página 1 e nunca passa da última', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(items(20));
      const pager = createPagination(source);
      pager.setPage(4);

      source.set(items(7));

      expect(pager.page()).toBe(1);
      pager.setPage(9);
      expect(pager.page()).toBe(2);
    });
  });

  it('atualizar um item no lugar (mesma quantidade) mantém a página', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(items(20));
      const pager = createPagination(source);
      pager.setPage(3);

      source.update((list) => list.map((item) => (item === 12 ? 120 : item)));

      expect(pager.page()).toBe(3);
      expect(pager.items()).toContain(120);
    });
  });

  it('lista vazia: uma página, sem itens', () => {
    TestBed.runInInjectionContext(() => {
      const pager = createPagination(signal<number[]>([]));

      expect(pager.totalPages()).toBe(1);
      expect(pager.range()).toEqual({ from: 0, to: 0 });
    });
  });

  it('páginas visíveis com reticências', () => {
    expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
    expect(visiblePages(5, 12)).toEqual([1, null, 4, 5, 6, null, 12]);
    expect(visiblePages(1, 12)).toEqual([1, 2, null, 12]);
  });
});
