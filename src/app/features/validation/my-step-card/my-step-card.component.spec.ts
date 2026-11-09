import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RegistrationData, ValidationStep } from '../../../core/models';
import { ValidationService } from '../../../core/services/validation.service';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { MyStepCardComponent } from './my-step-card.component';

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
  cnpj: null,
};

function identity(status: ValidationStep['status']): ValidationStep {
  return {
    id: '1',
    key: 'IDENTIDADE',
    type: 'IDENTIDADE',
    label: 'Identidade',
    practiceArea: null,
    status,
    justification: status === 'reprovada' ? 'Foto ilegível.' : null,
    document: {
      fileName: 'cnh.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
      sentAt: null,
      url: null,
      path: '/validacao/paciente/etapas/1/documento',
    },
    attachment: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-10-01T10:00:00Z',
    history: [],
  };
}

describe('MyStepCardComponent', () => {
  function render(step: ValidationStep, type: ValidationStep['type'] = 'IDENTIDADE', heading = 'Identidade') {
    TestBed.configureTestingModule({
      imports: [MyStepCardComponent],
      providers: [
        provideHttpClient(),
        { provide: ValidationService, useValue: { resubmit: () => of() } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['updateValidationStatus']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
      ],
    });
    const fixture = TestBed.createComponent(MyStepCardComponent);
    fixture.componentRef.setInput('profile', 'patient');
    fixture.componentRef.setInput('type', type);
    fixture.componentRef.setInput('heading', heading);
    fixture.componentRef.setInput('step', step);
    fixture.componentRef.setInput('data', DATA);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra os dados atuais e o documento, com o lápis para editar', () => {
    const fixture = render(identity('aprovada'));
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).not.toContain('529.982.247-25');
    expect(element.textContent).toContain('CNH 02650306461');
    expect(element.textContent).toContain('Feminino');
    expect(element.textContent).toContain('cnh.pdf');
    expect(element.querySelector('form')).toBeNull();

    (element.querySelector('button[aria-label="Editar Identidade"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('form')).not.toBeNull();
  });

  it('o card de registro mostra o número e as especialidades da atuação', () => {
    const registro: ValidationStep = {
      ...identity('pendente'),
      key: 'REGISTRO_PROFISSIONAL:201',
      type: 'REGISTRO_PROFISSIONAL',
      label: 'Registro profissional — Médico(a)',
      practiceArea: {
        id: '201',
        category: 'MEDICO',
        categoryLabel: 'Médico(a)',
        label: 'Médico(a)',
        registrationLabel: 'CRM',
        specialties: [{ id: '9', name: 'Clínica Médica', category: 'MEDICO' }],
        registrationNumber: '98765',
        registrationUf: 'SP',
      },
    };
    const element: HTMLElement = render(registro, 'REGISTRO_PROFISSIONAL', registro.label).nativeElement;

    expect(element.textContent).toContain('CRM');
    expect(element.textContent).toContain('98765 / SP');
    expect(element.textContent).toContain('Clínica Médica');
  });

  it('reprovada: mostra o motivo e já abre para corrigir', () => {
    const element: HTMLElement = render(identity('reprovada')).nativeElement;

    expect(element.textContent).toContain('Foto ilegível.');
    expect(element.querySelector('form')).not.toBeNull();
  });
});
