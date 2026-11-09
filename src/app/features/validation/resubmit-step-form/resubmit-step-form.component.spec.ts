import { provideHttpClient } from '@angular/common/http';
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
  practiceAreas: [],
  cnpj: '00000000000191',
};

function step(status: ValidationStep['status']): ValidationStep {
  return {
    id: '1',
    key: 'CNPJ',
    type: 'CNPJ',
    label: 'CNPJ',
    practiceArea: null,
    status,
    justification: null,
    document: { fileName: 'cartao-cnpj.pdf', contentType: 'application/pdf', sizeBytes: 100, sentAt: null, url: null },
    attachment: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-10-01T10:00:00Z',
    history: [],
  };
}

describe('ResubmitStepFormComponent', () => {
  let validationService: jasmine.SpyObj<ValidationService>;

  function render(current: ValidationStep | null, type: ValidationStep['type'] = 'CNPJ') {
    validationService = jasmine.createSpyObj<ValidationService>('ValidationService', ['resubmit']);
    validationService.resubmit.and.returnValue(of({ status: 'aprovado' } as ValidationDetail));
    TestBed.configureTestingModule({
      imports: [ResubmitStepFormComponent],
      providers: [
        provideHttpClient(),
        { provide: ValidationService, useValue: validationService },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['updateValidationStatus']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
      ],
    });
    const fixture = TestBed.createComponent(ResubmitStepFormComponent);
    fixture.componentRef.setInput('profile', 'professional');
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('step', current);
    fixture.componentRef.setInput('data', DATA);
    fixture.detectChanges();
    return fixture;
  }

  function submit(fixture: ReturnType<typeof render>): void {
    (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('sem mudar nada, pergunta antes e só envia se confirmar', () => {
    const fixture = render(step('aprovada'));

    submit(fixture);

    expect(validationService.resubmit).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Parece que nada mudou. Enviar para validação mesmo assim?');

    (fixture.componentInstance as unknown as { confirmUnchanged(): void }).confirmUnchanged();

    expect(validationService.resubmit).toHaveBeenCalledWith('professional', 'CNPJ', {
      document: undefined,
      cnpj: '00000000000191',
    }, undefined);
  });

  it('mudando só o dado, envia sem documento novo e mantém o atual', () => {
    const fixture = render(step('aprovada'));
    expect(fixture.nativeElement.textContent).toContain('Os dados voltam para análise do administrador');

    const component = fixture.componentInstance as unknown as { form: { patchValue(value: object): void } };
    component.form.patchValue({ cnpj: '11222333000181' });
    submit(fixture);

    expect(validationService.resubmit).toHaveBeenCalledWith('professional', 'CNPJ', {
      document: undefined,
      cnpj: '11222333000181',
    }, undefined);
  });

  it('incluindo CNPJ novo, sem documento anterior, o documento é obrigatório', () => {
    const fixture = render(null);
    (fixture.componentInstance as unknown as { form: { patchValue(value: object): void } }).form.patchValue({
      cnpj: '11222333000181',
    });

    submit(fixture);

    expect(validationService.resubmit).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Envie o documento desta etapa.');
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

    expect(validationService.resubmit).toHaveBeenCalledWith('professional', 'CNPJ', { document, cnpj: '11222333000181' }, undefined);
  });

  it('o registro de uma atuação já vem preenchido e vai com o id da atuação', () => {
    const registro: ValidationStep = {
      ...step('aprovada'),
      key: 'REGISTRO_PROFISSIONAL:200',
      type: 'REGISTRO_PROFISSIONAL',
      label: 'Registro profissional — Enfermeiro(a)',
      practiceArea: {
        id: '200',
        category: 'ENFERMEIRO',
        categoryLabel: 'Enfermeiro(a)',
        label: 'Enfermeiro(a)',
        registrationLabel: 'COREN',
        specialties: [],
        registrationNumber: '123456',
        registrationUf: 'SP',
      },
    };
    const fixture = render(registro, 'REGISTRO_PROFISSIONAL');
    expect(fixture.nativeElement.textContent).toContain('você não envia novas propostas de Enfermeiro(a)');

    (fixture.componentInstance as unknown as { form: { patchValue(value: object): void } }).form.patchValue({
      registrationNumber: '654321',
    });
    submit(fixture);

    expect(validationService.resubmit).toHaveBeenCalledWith(
      'professional',
      'REGISTRO_PROFISSIONAL',
      { document: undefined, registrationNumber: '654321', registrationUf: 'SP' },
      '200',
    );
  });

  it('sem mudar dado, pode só trocar o documento', () => {
    const fixture = render(step('aprovada'));
    const document = new File(['x'], 'cartao-legivel.pdf', { type: 'application/pdf' });
    (fixture.componentInstance as unknown as { onDocumentChange(file: File | null): void }).onDocumentChange(document);

    submit(fixture);

    expect(validationService.resubmit).toHaveBeenCalledWith('professional', 'CNPJ', { document, cnpj: '00000000000191' }, undefined);
  });
});
