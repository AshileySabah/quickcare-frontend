import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfessionalCategoryInfo, Specialty, User } from '../../../core/models';
import { ProfileService } from '../../../core/services/profile.service';
import { SpecialtyService } from '../../../core/services/specialty.service';
import { UfService } from '../../../core/services/uf.service';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { ProfessionalRegisterComponent } from './professional-register.component';

const CATEGORIES: ProfessionalCategoryInfo[] = [
  { value: 'MEDICO', label: 'Médico(a)', registrationLabel: 'CRM' },
  { value: 'ENFERMEIRO', label: 'Enfermeiro(a)', registrationLabel: 'COREN' },
  { value: 'CUIDADOR', label: 'Cuidador(a)', registrationLabel: null },
  { value: 'OUTRO', label: 'Outros profissionais', registrationLabel: 'Registro profissional' },
];

const SPECIALTIES: Specialty[] = [
  { id: '1', name: 'Clínica Médica', category: 'MEDICO' },
  { id: '15', name: 'Cuidador de Idosos', category: 'CUIDADOR' },
  { id: '18', name: 'Fisioterapia', category: 'OUTRO' },
];

function invalidPaths(control: AbstractControl, path = ''): string[] {
  if (control instanceof FormGroup || control instanceof FormArray) {
    const own = control.errors ? [`${path || 'form'} ${JSON.stringify(control.errors)}`] : [];
    return [
      ...own,
      ...Object.entries(control.controls).flatMap(([key, child]) =>
        invalidPaths(child as AbstractControl, path ? `${path}.${key}` : key),
      ),
    ];
  }
  return control.invalid ? [`${path} ${JSON.stringify(control.errors)}`] : [];
}

describe('ProfessionalRegisterComponent', () => {
  let authService: jasmine.SpyObj<AuthService>;

  function render() {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['registerProfessional', 'createProfessionalProfile']);
    authService.registerProfessional.and.returnValue(of({} as User));
    TestBed.configureTestingModule({
      imports: [ProfessionalRegisterComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: SpecialtyService, useValue: { list: () => of(SPECIALTIES), listCategories: () => of(CATEGORIES) } },
        { provide: UfService, useValue: { list: () => of([{ value: 'SP', label: 'SP' }]) } },
        { provide: ProfileService, useValue: { getPatientProfile: () => of(null) } },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info']) },
      ],
    });
    const fixture = TestBed.createComponent(ProfessionalRegisterComponent);
    fixture.detectChanges();
    return fixture;
  }

  function fill(fixture: ReturnType<typeof render>) {
    const component = fixture.componentInstance as unknown as {
      form: FormGroup;
      onDocumentsChange(documents: { file: File; type: string }[]): void;
    };
    const form = component.form;
    form.patchValue({
      name: 'Bruna Lima',
      email: 'bruna@example.com',
      phone: '11999998888',
      cpf: '52998224725',
      identityDocumentType: 'RG',
      identityDocumentNumber: '246781312',
      identityDocumentUf: 'SP',
      birthDate: '1990-01-01',
      gender: 'FEMININO',
      infoConfirmedTrue: true,
      lgpdConsent: true,
      attendsPresencial: true,
      raioAtendimentoKm: 10,
      address: {
        cep: '01310100',
        street: 'Avenida Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      password: 'Senha@Forte1',
      confirmPassword: 'Senha@Forte1',
    });
    const area = (form.get('practiceAreas') as FormArray).at(0) as FormGroup;
    area.get('category')!.setValue('MEDICO');
    area.patchValue({ specialtyIds: ['1'], registrationNumber: '98765', registrationUf: 'SP' });
    area.get('document')!.setValue(new File(['x'], 'crm.pdf'));
    component.onDocumentsChange([
      { file: new File(['x'], 'cpf.pdf'), type: 'COMPROVANTE_CPF' },
      { file: new File(['x'], 'rg.pdf'), type: 'VALIDACAO_CPF' },
    ]);
    fixture.detectChanges();
    return form;
  }

  function submit(fixture: ReturnType<typeof render>) {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  }

  it('com tudo preenchido, criar conta envia o cadastro', () => {
    const fixture = render();
    const form = fill(fixture);

    expect(invalidPaths(form)).toEqual([]);
    submit(fixture);

    expect(authService.registerProfessional).toHaveBeenCalledWith(
      jasmine.objectContaining({
        practiceAreas: [jasmine.objectContaining({ category: 'MEDICO', specialtyIds: ['1'], registrationNumber: '98765' })],
      }),
    );
  });

  it('preenchendo a atuação pela tela, criar conta envia o cadastro', () => {
    const fixture = render();
    const form = fill(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const area = (form.get('practiceAreas') as FormArray).at(0) as FormGroup;
    area.reset({ category: '', specialtyIds: [], specialtySingle: '', registrationNumber: '', registrationUf: '', document: null });
    fixture.detectChanges();

    const fields = element.querySelector('app-practice-area-fields')!;
    const category = fields.querySelector<HTMLSelectElement>('ui-select[formcontrolname="category"] select')!;
    category.value = 'MEDICO';
    category.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    fields.querySelector<HTMLElement>('ui-multi-select[formcontrolname="specialtyIds"] [role="combobox"]')!.click();
    fixture.detectChanges();
    fields.querySelector<HTMLElement>('[role="option"]')!.click();
    fixture.detectChanges();

    const number = fields.querySelector<HTMLInputElement>('ui-input[formcontrolname="registrationNumber"] input')!;
    number.value = '98765';
    number.dispatchEvent(new Event('input'));
    const uf = fields.querySelector<HTMLSelectElement>('ui-select[formcontrolname="registrationUf"] select')!;
    uf.value = 'SP';
    uf.dispatchEvent(new Event('change'));

    const file = fields.querySelector<HTMLInputElement>('input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'crm.pdf', { type: 'application/pdf' }));
    file.files = transfer.files;
    file.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(invalidPaths(form)).toEqual([]);
    submit(fixture);
    expect(authService.registerProfessional).toHaveBeenCalled();
  });

  it('com três atuações incluídas pela tela (médico, outros e cuidador), criar conta envia o cadastro', () => {
    const fixture = render();
    const form = fill(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const addButton = () =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('app-practice-areas-card button')).find((button) =>
        button.textContent?.includes('Incluir outra atuação'),
      )!;
    const choose = (fields: Element, name: string, value: string) => {
      const select = fields.querySelector<HTMLSelectElement>(`ui-select[formcontrolname="${name}"] select`)!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const attach = (fields: Element) => {
      const input = fields.querySelector<HTMLInputElement>('input[type="file"]')!;
      const transfer = new DataTransfer();
      transfer.items.add(new File(['x'], 'registro.pdf', { type: 'application/pdf' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    addButton().click();
    fixture.detectChanges();
    addButton().click();
    fixture.detectChanges();
    const all = element.querySelectorAll('app-practice-area-fields');
    expect(all.length).toBe(3);

    choose(all[1], 'category', 'OUTRO');
    choose(all[1], 'specialtySingle', '18');
    const number = all[1].querySelector<HTMLInputElement>('ui-input[formcontrolname="registrationNumber"] input')!;
    number.value = 'CREFITO-3 1234';
    number.dispatchEvent(new Event('input'));
    choose(all[1], 'registrationUf', 'SP');
    attach(all[1]);

    choose(all[2], 'category', 'CUIDADOR');
    all[2].querySelector<HTMLElement>('[role="combobox"]')!.click();
    fixture.detectChanges();
    all[2].querySelector<HTMLElement>('[role="option"]')!.click();
    fixture.detectChanges();

    expect(invalidPaths(form)).toEqual([]);
    submit(fixture);
    expect(authService.registerProfessional).toHaveBeenCalledWith(
      jasmine.objectContaining({
        practiceAreas: [
          jasmine.objectContaining({ category: 'MEDICO' }),
          jasmine.objectContaining({ category: 'OUTRO', specialtyIds: ['18'] }),
          jasmine.objectContaining({ category: 'CUIDADOR', specialtyIds: ['15'] }),
        ],
      }),
    );
  });

  it('com o serviço de verdade, criar conta faz a requisição de cadastro', () => {
    TestBed.overrideProvider(AuthService, { useFactory: () => new AuthService() });
    const fixture = render();
    fill(fixture);
    const http = TestBed.inject(HttpTestingController);

    submit(fixture);

    const request = http.expectOne((req) => req.url.endsWith('/usuarios/cadastro/profissional'));
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body.getAll('tiposDocumento')).toEqual(['COMPROVANTE_CPF', 'VALIDACAO_CPF', 'REGISTRO_PROFISSIONAL']);
  });

  it('com o formulário certo mas faltando documento, não envia e leva até os documentos', async () => {
    const fixture = render();
    const form = fill(fixture);
    form.patchValue({ cnpj: '11222333000181' });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    const documents = element.querySelector<HTMLElement>('ui-documents-card')!;
    const scroll = spyOn(documents, 'scrollIntoView');

    submit(fixture);
    TestBed.inject(ApplicationRef).tick();
    await fixture.whenStable();

    expect(authService.registerProfessional).not.toHaveBeenCalled();
    expect(documents.getAttribute('data-invalid')).toBe('true');
    expect(documents.textContent).toContain('Envie um documento que valide o CNPJ informado.');
    expect(scroll).toHaveBeenCalled();
    fixture.destroy();
    element.remove();
  });

  it('com campo faltando, não envia e mostra o erro', () => {
    const fixture = render();
    const form = fill(fixture);
    form.patchValue({ phone: '' });

    submit(fixture);

    expect(authService.registerProfessional).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(0);
  });
});
