import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ALL, FilterOption, ListFilters, ListSelectFilter } from '../../../core/lists/list-filters';
import { ButtonComponent } from '../button/button.component';
import { EmptyStateComponent } from '../feedback/empty-state/empty-state.component';
import { InputComponent } from '../forms/input/input.component';
import { SelectComponent } from '../forms/select/select.component';
import { CardComponent } from '../layout/card/card.component';
import { GridItemComponent } from '../layout/grid/grid-item.component';
import { GridComponent } from '../layout/grid/grid.component';
import { PaginatorComponent } from '../paginator/paginator.component';

export interface ItemNoun {
  one: string;
  other: string;
}

@Component({
  selector: 'ui-list-filters',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    GridComponent,
    GridItemComponent,
    InputComponent,
    PaginatorComponent,
    SelectComponent,
  ],
  templateUrl: './list-filters.component.html',
  styleUrl: './list-filters.component.scss',
})
export class ListFiltersComponent {
  filters = input.required<ListFilters<any>>();
  noun = input.required<ItemNoun>();

  protected optionsOf(select: ListSelectFilter<unknown>): FilterOption[] {
    return [{ value: ALL, label: select.allLabel }, ...select.options()];
  }

  protected sortOptions(): FilterOption[] {
    return this.filters().config.sorts.map((sort) => ({ value: sort.value, label: sort.label }));
  }
}
