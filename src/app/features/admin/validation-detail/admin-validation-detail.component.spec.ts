import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PreValidationResult, ValidationDetail, ValidationStep } from '../../../core/models';
import { FeatureFlagService } from '../../../core/services/feature-flag.service';
import { ValidationService } from '../../../core/services/validation.service';
import { AdminValidationDetailComponent } from './admin-validation-detail.component';

function step(id: string, type: ValidationStep['type'], label: string, status: ValidationStep['status'] = 'pendente'): ValidationStep {
  return {
    id,
    key: type,
    type,
    label,
    practiceArea: null,
    status,
    justification: null,
    document: null,
    attachment: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-11-19T10:00:00Z',
    history: [],
  };
}

function detail(steps: ValidationStep[]): ValidationDetail {
  return {
    id: '12',
    profile: 'professional',
    status: 'pendente',
    revalidating: false,
    creationLocked: false,
    registeredAt: '2026-11-19T10:00:00Z',
    data: {
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
      cnpj: '47318265000104',
    },
    steps,
  };
}

const RESULT: PreValidationResult = {
  stepType: 'CPF',
  opinion: 'favoravel',
  checks: [],
  suggestedJustification: 'CPF regular na Receita Federal.',
  checkedAt: '2026-11-20T10:00:00Z',
};

describe('AdminValidationDetailComponent', () => {
  const displayPreValidation = signal(true);
  let validationService: { getForAdmin: jasmine.Spy; preValidate: jasmine.Spy };

  function render(steps = [step('1', 'CPF', 'CPF'), step('2', 'CNPJ', 'CNPJ')]): ComponentFixture<AdminValidationDetailComponent> {
    validationService = {
      getForAdmin: jasmine.createSpy('getForAdmin').and.returnValue(of(detail(steps))),
      preValidate: jasmine.createSpy('preValidate').and.returnValue(of(RESULT)),
    };
    TestBed.configureTestingModule({
      imports: [AdminValidationDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ValidationService, useValue: validationService },
        { provide: FeatureFlagService, useValue: { displayPreValidation } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { profile: 'professional' }, paramMap: convertToParamMap({ id: '12' }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(AdminValidationDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  function buttonsWith(fixture: ComponentFixture<AdminValidationDetailComponent>, text: string): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter((button) =>
      button.textContent?.includes(text),
    );
  }

  beforeEach(() => displayPreValidation.set(true));

  it('mostra o bloco de pré-validação e um botão por etapa quando a flag está ligada', () => {
    const fixture = render();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pré-validação com APIs de terceiros');
    expect(buttonsWith(fixture, 'Pré-validar todas as etapas').length).toBe(1);
    expect(buttonsWith(fixture, 'Pré-validar esta etapa').length).toBe(2);
  });

  it('esconde toda a pré-validação quando a flag está desligada', () => {
    displayPreValidation.set(false);
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('Pré-validação com APIs de terceiros');
    expect(buttonsWith(fixture, 'Pré-validar todas as etapas').length).toBe(0);
    expect(buttonsWith(fixture, 'Pré-validar esta etapa').length).toBe(0);
    expect(element.querySelectorAll('article[aria-label^="Etapa "]').length).toBe(2);
  });

  it('pré-validar todas consulta cada etapa pendente', () => {
    const fixture = render([step('1', 'CPF', 'CPF'), step('2', 'CNPJ', 'CNPJ'), step('3', 'IDENTIDADE', 'Documento de identidade', 'aprovada')]);

    buttonsWith(fixture, 'Pré-validar todas as etapas')[0].click();

    expect(validationService.preValidate).toHaveBeenCalledTimes(2);
  });

  it('sem etapas pendentes não mostra o bloco mesmo com a flag ligada', () => {
    const fixture = render([step('1', 'CPF', 'CPF', 'aprovada')]);

    expect(buttonsWith(fixture, 'Pré-validar todas as etapas').length).toBe(0);
  });
});
