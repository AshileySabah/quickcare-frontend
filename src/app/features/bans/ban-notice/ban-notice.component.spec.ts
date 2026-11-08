import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Ban } from '../../../core/models';
import { BanService } from '../../../core/services/ban.service';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { BanNoticeComponent } from './ban-notice.component';

const BAN: Ban = {
  id: '300',
  role: 'patient',
  type: 'suspensao',
  start: '2026-11-06T12:00:00Z',
  end: '2026-11-21T12:00:00Z',
  justification: 'Golpe confirmado.',
  active: true,
  canAppeal: true,
};

describe('BanNoticeComponent', () => {
  let fixture: ComponentFixture<BanNoticeComponent>;
  let banService: jasmine.SpyObj<BanService>;

  function render(ban: Ban | null): void {
    banService = jasmine.createSpyObj<BanService>('BanService', ['current', 'appeal']);
    banService.current.and.returnValue(of(ban));
    TestBed.configureTestingModule({
      imports: [BanNoticeComponent],
      providers: [
        { provide: BanService, useValue: banService },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
      ],
    });
    fixture = TestBed.createComponent(BanNoticeComponent);
    fixture.componentRef.setInput('role', 'patient');
    fixture.detectChanges();
  }

  const element = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(element().querySelectorAll('button')).find((candidate) => candidate.textContent!.trim().startsWith(text));

  it('sem banimento não mostra nada', () => {
    render(null);

    expect(element().textContent).not.toContain('Perfil banido');
  });

  it('mostra o banimento com motivo e o botão de recorrer', () => {
    render(BAN);

    expect(element().textContent).toContain('Perfil banido');
    expect(element().textContent).toContain('Motivo: Golpe confirmado.');
    expect(button('Recorrer')).toBeTruthy();
  });

  it('recorrer envia o texto e esconde o botão', () => {
    render(BAN);
    banService.appeal.and.returnValue(
      of({ ...BAN, canAppeal: false, appeal: { status: 'em_analise', text: 'Não fui eu.', createdAt: BAN.start } }),
    );

    button('Recorrer')!.click();
    fixture.detectChanges();
    const textarea = element().querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Não fui eu.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button('Sim, enviar o recurso')!.click();
    fixture.detectChanges();

    expect(banService.appeal).toHaveBeenCalledWith('patient', '300', 'Não fui eu.');
    expect(element().textContent).toContain('Recurso em análise');
    expect(button('Recorrer')).toBeUndefined();
  });
});
