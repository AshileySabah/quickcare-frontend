import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { PracticeAreaGroup, buildPracticeAreaGroup } from '../../../../core/forms/practice-area-form';
import { ProfessionalCategoryInfo, Specialty } from '../../../../core/models';
import { PracticeAreaFieldsComponent } from './practice-area-fields.component';

const CATEGORIES: ProfessionalCategoryInfo[] = [
  { value: 'MEDICO', label: 'Médico(a)', registrationLabel: 'CRM' },
  { value: 'CUIDADOR', label: 'Cuidador(a)', registrationLabel: null },
  { value: 'OUTRO', label: 'Outros profissionais', registrationLabel: 'Registro profissional' },
];

const SPECIALTIES: Specialty[] = [
  { id: '18', name: 'Fisioterapia', category: 'OUTRO' },
  { id: '19', name: 'Psicologia', category: 'OUTRO' },
];

describe('PracticeAreaFieldsComponent', () => {
  const fb = new FormBuilder();

  function render(group: PracticeAreaGroup, inputs: { siblings?: PracticeAreaGroup[]; existingKeys?: string[] }) {
    TestBed.configureTestingModule({ imports: [PracticeAreaFieldsComponent] });
    const fixture = TestBed.createComponent(PracticeAreaFieldsComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('categoryOptions', CATEGORIES);
    fixture.componentRef.setInput('specialties', SPECIALTIES);
    fixture.componentRef.setInput('siblings', inputs.siblings ?? []);
    fixture.componentRef.setInput('existingKeys', inputs.existingKeys ?? []);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function option(element: HTMLElement, control: string, value: string): HTMLOptionElement {
    return element.querySelector<HTMLOptionElement>(`ui-select[formcontrolname="${control}"] option[value="${value}"]`)!;
  }

  it('no cadastro, a categoria já escolhida em outra atuação fica desativada, menos Outros profissionais', () => {
    const other = buildPracticeAreaGroup(fb);
    other.controls.category.setValue('MEDICO');
    const own = buildPracticeAreaGroup(fb);

    const { element } = render(own, { siblings: [other, own] });

    expect(option(element, 'category', 'MEDICO').disabled).toBeTrue();
    expect(option(element, 'category', 'MEDICO').textContent).toContain('(já incluída)');
    expect(option(element, 'category', 'CUIDADOR').disabled).toBeFalse();
    expect(option(element, 'category', 'OUTRO').disabled).toBeFalse();
  });

  it('a própria escolha da atuação não fica desativada para ela', () => {
    const own = buildPracticeAreaGroup(fb);
    own.controls.category.setValue('MEDICO');

    const { element } = render(own, { siblings: [own] });

    expect(option(element, 'category', 'MEDICO').disabled).toBeFalse();
  });

  it('em Outros profissionais, desativa a especialidade que já é uma atuação', () => {
    const own = buildPracticeAreaGroup(fb);
    own.controls.category.setValue('OUTRO');

    const { element } = render(own, { existingKeys: ['MEDICO', 'OUTRO:18'] });

    expect(option(element, 'category', 'MEDICO').disabled).toBeTrue();
    expect(option(element, 'category', 'OUTRO').disabled).toBeFalse();
    expect(option(element, 'specialtySingle', '18').disabled).toBeTrue();
    expect(option(element, 'specialtySingle', '19').disabled).toBeFalse();
  });
});
