import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PersonChipComponent, UNAVAILABLE_PROFILE_LABEL } from './person-chip.component';

describe('PersonChipComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PersonChipComponent],
      providers: [provideRouter([])],
    });
  });

  it('mostra nome e link quando o perfil está disponível', () => {
    const fixture = TestBed.createComponent(PersonChipComponent);
    fixture.componentRef.setInput('name', 'Joana Enfermeira');
    fixture.componentRef.setInput('link', ['/patient/profissionais', '20']);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Joana Enfermeira');
    expect(element.querySelector('a')).not.toBeNull();
  });

  it('esconde nome, foto e link quando o perfil está indisponível', () => {
    const fixture = TestBed.createComponent(PersonChipComponent);
    fixture.componentRef.setInput('name', 'Joana Enfermeira');
    fixture.componentRef.setInput('avatarUrl', 'https://exemplo.com/foto.png');
    fixture.componentRef.setInput('link', ['/patient/profissionais', '20']);
    fixture.componentRef.setInput('unavailable', true);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain(UNAVAILABLE_PROFILE_LABEL);
    expect(element.textContent).not.toContain('Joana');
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('a')).toBeNull();
  });
});
