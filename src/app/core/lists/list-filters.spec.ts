import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ALL, ListFilters, createListFilters } from './list-filters';

interface Item {
  name: string;
  color: string;
  order: number;
}

describe('createListFilters', () => {
  const items = signal<Item[]>([
    { name: 'Curativo diário', color: 'azul', order: 2 },
    { name: 'Nutrição online', color: 'verde', order: 1 },
    { name: 'Sondagem', color: 'azul', order: 3 },
  ]);

  function create(): ListFilters<Item> {
    return TestBed.runInInjectionContext(() =>
      createListFilters(new FormBuilder(), items, {
        searchPlaceholder: 'Buscar',
        searchText: (item) => item.name,
        selects: [
          {
            key: 'color',
            label: 'Cor',
            allLabel: 'Todas',
            options: () => [
              { value: 'azul', label: 'Azul' },
              { value: 'verde', label: 'Verde' },
            ],
            matches: (item, value) => item.color === value,
          },
        ],
        sorts: [
          { value: 'ordem', label: 'Ordem', compare: (a, b) => a.order - b.order },
          { value: 'nome', label: 'Nome', compare: (a, b) => a.name.localeCompare(b.name) },
        ],
      }),
    );
  }

  it('começa sem filtro, na primeira ordenação', () => {
    const filters = create();

    expect(filters.filtered().map((item) => item.order)).toEqual([1, 2, 3]);
    expect(filters.hasActive()).toBeFalse();
    expect(filters.form.controls['color'].value).toBe(ALL);
  });

  it('busca sem diferenciar acento e maiúscula, e combina com os selects', () => {
    const filters = create();

    filters.form.patchValue({ search: 'NUTRICAO' });
    expect(filters.filtered().map((item) => item.name)).toEqual(['Nutrição online']);

    filters.form.patchValue({ search: '', color: 'azul' });
    expect(filters.filtered().map((item) => item.order)).toEqual([2, 3]);
    expect(filters.hasActive()).toBeTrue();
  });

  it('limpar volta ao estado inicial', () => {
    const filters = create();
    filters.form.patchValue({ color: 'verde', sort: 'nome' });

    filters.clear();

    expect(filters.hasActive()).toBeFalse();
    expect(filters.filtered().length).toBe(3);
  });
});
