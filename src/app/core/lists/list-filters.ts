import { Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { map } from 'rxjs';
import { Pagination, createPagination } from './pagination';

export const ALL = 'todos';

export interface FilterOption {
  value: string;
  label: string;
}

export interface ListSelectFilter<T> {
  key: string;
  label: string;
  allLabel: string;
  options: () => FilterOption[];
  matches: (item: T, value: string) => boolean;
}

export interface ListSort<T> {
  value: string;
  label: string;
  compare: (a: T, b: T) => number;
}

export interface ListFiltersConfig<T> {
  searchPlaceholder: string;
  searchText: (item: T) => string;
  selects: ListSelectFilter<T>[];
  sorts: ListSort<T>[];
}

export interface ListFilters<T> {
  readonly form: FormGroup<Record<string, FormControl<string>>>;
  readonly config: ListFiltersConfig<T>;
  readonly filtered: Signal<T[]>;
  readonly page: Pagination<T>;
  readonly hasActive: Signal<boolean>;
  clear(): void;
}

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function createListFilters<T>(fb: FormBuilder, items: Signal<T[]>, config: ListFiltersConfig<T>): ListFilters<T> {
  const defaults: Record<string, string> = { search: '', sort: config.sorts[0]?.value ?? '' };
  for (const select of config.selects) {
    defaults[select.key] = ALL;
  }

  const form = fb.nonNullable.group(
    Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, fb.nonNullable.control(value)])),
  ) as FormGroup<Record<string, FormControl<string>>>;
  const values = toSignal(form.valueChanges.pipe(map(() => form.getRawValue())), { initialValue: form.getRawValue() });

  const filtered = computed(() => {
    const current = values();
    const term = normalize(current['search'].trim());
    const sort = config.sorts.find((option) => option.value === current['sort']);

    const result = items().filter(
      (item) =>
        config.selects.every((select) => current[select.key] === ALL || select.matches(item, current[select.key])) &&
        (!term || normalize(config.searchText(item)).includes(term)),
    );
    return sort ? [...result].sort(sort.compare) : result;
  });

  const hasActive = computed(() => Object.keys(defaults).some((key) => values()[key] !== defaults[key]));

  return { form, config, filtered, page: createPagination(filtered), hasActive, clear: () => form.reset(defaults) };
}
