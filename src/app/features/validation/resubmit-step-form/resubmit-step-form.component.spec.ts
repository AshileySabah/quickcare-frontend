import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RegistrationData, ValidationDetail, ValidationStep } from '../../../core/models';
import { ValidationService } from '../../../core/services/validation.service';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { ResubmitStepFormComponent } from './resubmit-step-form.component';

const DATA: RegistrationData = {
  name: 'Joana',
  email: 'joana@quickcare.dev',
  phone: null,
  avatarUrl: null,
  cpf: '52998224725',
  birthDate: '1990-01-01',
  gender: 'FEMININO',
  identityDocumentType: 'CNH',
  identityDocumentNumber: '02650306461',
  identityDocumentUf: null,
  address: { cep: '01311000', street: 'Rua Augusta', number: '1000', neighborhood: 'Consolação', city: 'São Paulo', state: 'SP' },
  category: 'ENFERMEIRO',
  specialties: [],
  cnpj: '00000000000191',
  registrationNumber: '123456',
  registrationUf: 'SP',
};

function step(status: ValidationStep['status']): ValidationStep {
  return {
    id: '1',
    type: 'CNPJ',
    label: 'CNPJ',
    status,
    justification: null,
    document: null,
    attachment: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-10-01T10:00:00Z',
    history: [],
  };
}

describe('ResubmitStepFormComponent', () => {
  let validationService: jasmine.SpyObj<ValidationService>;

  function render(current: ValidationStep | null) {
    validationService = jasmine.createSpyObj<ValidationService>('ValidationService', ['resubmit']);
    validationService.resubmit.and.returnValue(of({ status: 'aprovado' } as ValidationDetail));
    TestBed.configureTestingModule({
      imports: [ResubmitStepFormComponent],
      providers: [
        { provide: ValidationService, useValue: validationService },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['updateValidationStatus']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
      ],
    });
    const fixture = TestBed.createComponent(ResubmitStepFormComponent);
    fixture.componentRef.setInput('profile', 'professional');
    fixture.componentRef.setInput('type', 'CNPJ');
    fixture.componentRef.setInput('step', current);
    fixture.componentRef.setInput('data', DATA);
    fixture.detectChanges();
    return fixture;
  }

  function submit(fixture: ReturnType<typeof render>): void {
    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('sem mudar nada nem mandar documento, não envia e explica', () => {
    const fixture = render(step('aprovada'));

    submit(fixture);

    expect(validationService.resubmit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Altere algum dado ou envie um novo documento.');
  });

  it('mudando o dado sem mandar o documento, não envia e pede o documento', () => {
    const fixture = render(step('aprovada'));
    expect(fixture.nativeElement.textContent).toContain('Os dados voltam para análise do administrador');

    const component = fixture.componentInstance as unknown as { form: { patchValue(value: object): void } };
    component.form.patchValue({ cnpj: '11222333000181' });
    submit(fixture);

    expect(validationService.resubmit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Envie o documento que comprova os dados informados.');
  });

  it('com o dado novo e o documento, envia os dois', () => {
    const fixture = render(step('aprovada'));
    const document = new File(['x'], 'cartao-cnpj.pdf', { type: 'application/pdf' });
    const component = fixture.componentInstance as unknown as {
      form: { patchValue(value: object): void };
      onDocumentChange(file: File | null): void;
    };
    component.form.patchValue({ cnpj: '11222333000181' });
    component.onDocumentChange(document);
    submit(fixture);

    expect(validationService.resubmit).toHaveBeenCalledWith('professional', 'CNPJ', { document, cnpj: '11222333000181' });
  });

  it('sem mudar dado, pode só trocar o documento', () => {
    const fixture = render(step('aprovada'));
    const document = new File(['x'], 'cartao-legivel.pdf', { type: 'application/pdf' });
    (fixture.componentInstance as unknown as { onDocumentChange(file: File | null): void }).onDocumentChange(document);

    submit(fixture);

    expect(validationService.resubmit).toHaveBeenCalledWith('professional', 'CNPJ', { document, cnpj: '00000000000191' });
  });
});
