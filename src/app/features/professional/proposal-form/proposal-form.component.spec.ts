import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProposalInput } from '../../../core/services/proposal.service';
import { ProposalFormComponent } from './proposal-form.component';

describe('ProposalFormComponent', () => {
  function render(initial: ProposalInput | null) {
    TestBed.configureTestingModule({ imports: [ProposalFormComponent] });
    const fixture = TestBed.createComponent(ProposalFormComponent);
    fixture.componentRef.setInput('submitLabel', 'Salvar alterações');
    fixture.componentRef.setInput('initialValue', initial);
    fixture.detectChanges();
    const submitted = jasmine.createSpy('submitted');
    fixture.componentInstance.submitted.subscribe(submitted);
    const submit = () => {
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      fixture.detectChanges();
    };
    return { fixture, element: fixture.nativeElement as HTMLElement, submitted, submit };
  }

  it('editar uma proposta válida envia os dados', () => {
    const { submitted, submit } = render({
      price: 180,
      approach: 'Curativo diário com troca de cobertura e orientação à família.',
      start: '2027-01-11T11:00:00Z',
      end: '2027-01-11T21:00:00Z',
    });

    submit();

    expect(submitted).toHaveBeenCalledWith(jasmine.objectContaining({ price: 180 }));
  });

  it('enviar com erro deixa os campos vermelhos e põe o foco no primeiro com erro', () => {
    const { fixture, element, submitted, submit } = render(null);
    document.body.appendChild(element);

    submit();
    TestBed.inject(ApplicationRef).tick();

    expect(submitted).not.toHaveBeenCalled();
    expect(element.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(0);
    const price = element.querySelector('ui-input[formcontrolname="price"] input');
    expect(document.activeElement).toBe(price);
    fixture.destroy();
    element.remove();
  });

  it('reenvio: o mesmo valor inicial chegando de novo não apaga as datas escolhidas', () => {
    const resend = { price: 30, approach: 'teste aqui mais uma proposta.', start: '', end: '' };
    const { fixture, element, submitted, submit } = render(resend);
    const type = (name: string, value: string) => {
      const input = element.querySelector<HTMLInputElement>(`ui-input[formcontrolname="${name}"] input`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('start', '2027-11-15T17:05');
    type('end', '2027-11-23T17:05');

    fixture.componentRef.setInput('initialValue', { ...resend });
    fixture.detectChanges();
    submit();

    expect(submitted).toHaveBeenCalledWith(jasmine.objectContaining({ price: 30 }));
  });

  it('com início no passado não envia e mostra o erro no campo', () => {
    const { element, submitted, submit } = render({
      price: 150,
      approach: 'Curativo diário com troca de cobertura e orientação à família.',
      start: '2026-01-01T11:00:00Z',
      end: '2026-01-01T21:00:00Z',
    });

    submit();

    expect(submitted).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Escolha um início no futuro.');
  });
});
