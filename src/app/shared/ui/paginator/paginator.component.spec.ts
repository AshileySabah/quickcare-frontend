import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Pagination, createPagination } from '../../../core/lists/pagination';
import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  function render(count: number) {
    TestBed.configureTestingModule({ imports: [PaginatorComponent] });
    const pager = TestBed.runInInjectionContext(() =>
      createPagination(signal(Array.from({ length: count }, (_, index) => index + 1))),
    );
    const fixture = TestBed.createComponent(PaginatorComponent);
    fixture.componentRef.setInput('pagination', pager);
    fixture.detectChanges();
    return { fixture, pager: pager as Pagination<number>, element: fixture.nativeElement as HTMLElement };
  }

  it('aparece sempre: com uma página só, a navegação fica desabilitada', () => {
    const { element } = render(3);

    expect(element.textContent).toContain('Mostrando 1–3 de 3');
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!.disabled).toBeTrue();
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.disabled).toBeTrue();
  });

  it('mostra o intervalo, navega pelas páginas e troca a quantidade por página', () => {
    const { fixture, pager, element } = render(12);

    expect(element.textContent).toContain('Mostrando 1–5 de 12');
    element.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    fixture.detectChanges();
    expect(pager.items()).toEqual([6, 7, 8, 9, 10]);
    expect(element.textContent).toContain('Mostrando 6–10 de 12');

    const select = element.querySelector<HTMLSelectElement>('select')!;
    select.value = '10';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(pager.page()).toBe(1);
    expect(pager.items().length).toBe(10);
    expect(element.textContent).toContain('Mostrando 1–10 de 12');
  });
});
