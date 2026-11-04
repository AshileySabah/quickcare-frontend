import { TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  function render(warning: string | null) {
    TestBed.configureTestingModule({ imports: [ConfirmDialogComponent] });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('titleText', 'Bloquear');
    fixture.componentRef.setInput('message', 'Bloquear Joana?');
    fixture.componentRef.setInput('consequences', ['Primeira consequência.', 'Segunda consequência.']);
    fixture.componentRef.setInput('warning', warning);
    fixture.componentRef.setInput('confirmLabel', 'Sim, bloquear');
    fixture.componentRef.setInput('cancelLabel', 'Não, manter');
    fixture.detectChanges();
    return Array.from(document.querySelectorAll<HTMLLIElement>('.confirm-dialog__consequences li'));
  }

  it('mostra o aviso como último item da lista, destacado', () => {
    const items = render('Pode contar como ocorrência para você.');

    expect(items.length).toBe(3);
    expect(items[2].textContent?.trim()).toBe('Pode contar como ocorrência para você.');
    expect(items[2].classList).toContain('confirm-dialog__warning');
  });

  it('sem aviso, lista só as consequências', () => {
    const items = render(null);

    expect(items.length).toBe(2);
    expect(items.some((item) => item.classList.contains('confirm-dialog__warning'))).toBeFalse();
  });
});
