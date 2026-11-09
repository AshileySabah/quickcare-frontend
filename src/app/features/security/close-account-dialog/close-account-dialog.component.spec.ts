import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SecurityService } from '../../../core/services/security.service';
import { CloseAccountDialogComponent, ClosureResult } from './close-account-dialog.component';

describe('CloseAccountDialogComponent', () => {
  let fixture: ComponentFixture<CloseAccountDialogComponent>;
  let security: jasmine.SpyObj<SecurityService>;

  function create(roles: ('patient' | 'professional')[]): CloseAccountDialogComponent {
    fixture = TestBed.createComponent(CloseAccountDialogComponent);
    fixture.componentRef.setInput('activeRoles', roles);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    security = jasmine.createSpyObj<SecurityService>('SecurityService', ['requestClosureCode', 'close']);
    security.requestClosureCode.and.returnValue(of('Enviamos um código.'));
    security.close.and.returnValue(of(null));

    TestBed.configureTestingModule({
      imports: [CloseAccountDialogComponent],
      providers: [{ provide: SecurityService, useValue: security }],
    });
  });

  it('com um perfil só, oferece apenas encerrar a conta inteira', () => {
    const component = create(['patient']) as unknown as {
      targetOptions: () => { value: string }[];
      passwordForm: { getRawValue(): { target: string } };
    };

    expect(component.targetOptions().map((option) => option.value)).toEqual(['account']);
    expect(component.passwordForm.getRawValue().target).toBe('account');
  });

  it('com os dois perfis, deixa escolher qual encerrar', () => {
    const component = create(['patient', 'professional']) as unknown as {
      targetOptions: () => { value: string }[];
    };

    expect(component.targetOptions().map((option) => option.value)).toEqual(['patient', 'professional', 'account']);
  });

  it('pede o código e depois encerra o alvo escolhido', () => {
    const component = create(['patient', 'professional']) as unknown as {
      passwordForm: { setValue(value: { target: string; password: string }): void };
      codeForm: { setValue(value: { code: string }): void };
      step: () => string;
      confirm(): void;
    };
    let result: ClosureResult | undefined;
    fixture.componentInstance.done.subscribe((value) => (result = value));

    component.passwordForm.setValue({ target: 'professional', password: 'Senha@123' });
    component.confirm();

    expect(security.requestClosureCode).toHaveBeenCalledWith('professional', 'Senha@123');
    expect(component.step()).toBe('code');

    component.codeForm.setValue({ code: '123456' });
    component.confirm();

    expect(security.close).toHaveBeenCalledWith('professional', '123456');
    expect(result).toEqual({ target: 'professional', user: null });
  });

  it('não pede o código sem a senha', () => {
    const component = create(['patient', 'professional']) as unknown as {
      passwordForm: { setValue(value: { target: string; password: string }): void };
      confirm(): void;
    };

    component.passwordForm.setValue({ target: 'patient', password: '' });
    component.confirm();

    expect(security.requestClosureCode).not.toHaveBeenCalled();
  });
});
