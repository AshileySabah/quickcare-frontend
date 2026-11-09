import { TestBed } from '@angular/core/testing';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  function render(revealable: boolean) {
    TestBed.configureTestingModule({ imports: [InputComponent] });
    const fixture = TestBed.createComponent(InputComponent);
    fixture.componentRef.setInput('label', 'Senha');
    fixture.componentRef.setInput('type', 'password');
    fixture.componentRef.setInput('revealable', revealable);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('com o olho, mostra e volta a ocultar a senha', () => {
    const { fixture, element } = render(true);
    const field = element.querySelector('input')!;
    const toggle = element.querySelector<HTMLButtonElement>('button[aria-label="Mostrar senha"]')!;

    expect(field.type).toBe('password');
    expect(toggle.type).toBe('button');

    toggle.click();
    fixture.detectChanges();
    expect(field.type).toBe('text');
    expect(element.querySelector('button[aria-label="Ocultar senha"]')).not.toBeNull();

    toggle.click();
    fixture.detectChanges();
    expect(field.type).toBe('password');
  });

  it('sem o olho, não mostra o botão', () => {
    const { element } = render(false);

    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('input')!.type).toBe('password');
  });
});
