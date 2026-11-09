import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { PublicSearchFilters } from '../../../core/models';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { UfService } from '../../../core/services/uf.service';
import { PublicFiltersComponent } from './public-filters.component';

describe('PublicFiltersComponent', () => {
  let fixture: ComponentFixture<PublicFiltersComponent>;
  let emitted: PublicSearchFilters[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PublicFiltersComponent],
      providers: [
        {
          provide: SpecialtyService,
          useValue: {
            listCategories: () =>
              of([
                { value: 'ENFERMEIRO', label: 'Enfermeiro(a)', registrationLabel: 'COREN' },
                { value: 'CUIDADOR', label: 'Cuidador(a)', registrationLabel: null },
              ]),
            list: () =>
              of([
                { id: '5', name: 'Curativos', category: 'ENFERMEIRO' },
                { id: '7', name: 'Cuidador de Idosos', category: 'CUIDADOR' },
              ]),
          },
        },
        { provide: UfService, useValue: { list: () => of([{ value: 'SP', label: 'SP - São Paulo' }]) } },
      ],
    });
    fixture = TestBed.createComponent(PublicFiltersComponent);
    emitted = [];
    fixture.componentInstance.changed.subscribe((filters) => emitted.push(filters));
    fixture.detectChanges();
  });

  const selects = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select'));

  function choose(select: HTMLSelectElement, value: string): void {
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('trocar a categoria limpa a especialidade escolhida', fakeAsync(() => {
    choose(selects()[0], 'ENFERMEIRO');
    choose(selects()[1], '5');
    tick(300);

    choose(selects()[0], 'CUIDADOR');
    tick(300);

    expect(emitted.at(-1)).toEqual(jasmine.objectContaining({ category: 'CUIDADOR', specialtyId: undefined }));
  }));

  it('mostra só as especialidades da categoria escolhida', () => {
    choose(selects()[0], 'CUIDADOR');

    const options = Array.from(selects()[1].options).map((option) => option.textContent!.trim());
    expect(options).toContain('Cuidador de Idosos');
    expect(options).not.toContain('Curativos');
  });
});
