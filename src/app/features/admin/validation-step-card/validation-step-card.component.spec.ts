import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RegistrationData, ValidationStep } from '../../../core/models';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import { ValidationService } from '../../../core/services/validation.service';
import { ValidationStepCardComponent } from './validation-step-card.component';

const DATA: RegistrationData = {
  name: 'Rafael Lima',
  email: 'rafael.lima@email.com',
  phone: '11958314427',
  avatarUrl: null,
  cpf: '25173946873',
  birthDate: '1991-08-22',
  gender: 'MASCULINO',
  identityDocumentType: 'RG',
  identityDocumentNumber: '372846191',
  identityDocumentUf: 'SP',
  address: { cep: '05405000', street: 'Rua Teodoro Sampaio', number: '351', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP' },
  practiceAreas: [],
  cnpj: null,
};

function step(status: ValidationStep['status']): ValidationStep {
  return {
    id: '1',
    key: 'CPF',
    type: 'CPF',
    label: 'CPF',
    practiceArea: null,
    status,
    justification: status === 'pendente' ? null : 'CPF conferido.',
    document: null,
    attachment: null,
    reviewedBy: status === 'pendente' ? null : 'Admin QuickCare',
    reviewedAt: status === 'pendente' ? null : '2026-11-20T10:00:00Z',
    createdAt: '2026-11-19T10:00:00Z',
    history: [],
  };
}

describe('ValidationStepCardComponent', () => {
  const displayPreValidation = signal(true);

  function render(status: ValidationStep['status'] = 'pendente'): ComponentFixture<ValidationStepCardComponent> {
    TestBed.configureTestingModule({
      imports: [ValidationStepCardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ValidationService, useValue: {} },
        { provide: FeatureFlagService, useValue: { displayPreValidation } },
      ],
    });
    const fixture = TestBed.createComponent(ValidationStepCardComponent);
    fixture.componentRef.setInput('profile', 'professional');
    fixture.componentRef.setInput('validationId', '12');
    fixture.componentRef.setInput('step', step(status));
    fixture.componentRef.setInput('data', DATA);
    fixture.detectChanges();
    return fixture;
  }

  function preValidateButton(fixture: ComponentFixture<ValidationStepCardComponent>): HTMLButtonElement | undefined {
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    return buttons.find((button) => button.textContent?.includes('Pré-validar esta etapa'));
  }

  beforeEach(() => displayPreValidation.set(true));

  it('mostra o botão de pré-validar quando a flag está ligada', () => {
    const fixture = render();

    expect(preValidateButton(fixture)).toBeDefined();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('A pré-validação, se usada, já preenche um texto');
  });

  it('esconde o botão de pré-validar quando a flag está desligada', () => {
    displayPreValidation.set(false);
    const fixture = render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(preValidateButton(fixture)).toBeUndefined();
    expect(text).toContain('Obrigatória para aprovar ou reprovar.');
    expect(text).not.toContain('A pré-validação, se usada');
  });

  it('esconde o botão quando a flag é desligada depois de a tela abrir', () => {
    const fixture = render();
    displayPreValidation.set(false);
    fixture.detectChanges();

    expect(preValidateButton(fixture)).toBeUndefined();
  });

  it('emite o pedido de pré-validação ao clicar no botão', () => {
    const fixture = render();
    let emitted = false;
    fixture.componentInstance.preValidate.subscribe(() => (emitted = true));

    preValidateButton(fixture)!.click();

    expect(emitted).toBeTrue();
  });

  it('etapa já avaliada não mostra o botão mesmo com a flag ligada', () => {
    const fixture = render('aprovada');

    expect(preValidateButton(fixture)).toBeUndefined();
  });
});
