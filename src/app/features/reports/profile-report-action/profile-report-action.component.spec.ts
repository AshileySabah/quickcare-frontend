import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ReportService } from '../../../core/services/report.service';
import { UserBlockService } from '../../../core/services/user-block.service';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { ProfileReportActionComponent } from './profile-report-action.component';

describe('ProfileReportActionComponent', () => {
  let fixture: ComponentFixture<ProfileReportActionComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let userBlockService: jasmine.SpyObj<UserBlockService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    reportService = jasmine.createSpyObj<ReportService>('ReportService', ['send']);
    userBlockService = jasmine.createSpyObj<UserBlockService>('UserBlockService', ['preview', 'block']);
    userBlockService.preview.and.returnValue(of({ late: false, pendingProposals: 0, acceptedProposals: 0 } as never));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']);

    TestBed.configureTestingModule({
      imports: [ProfileReportActionComponent],
      providers: [
        { provide: ReportService, useValue: reportService },
        { provide: UserBlockService, useValue: userBlockService },
        { provide: ToastService, useValue: toast },
      ],
    });
    fixture = TestBed.createComponent(ProfileReportActionComponent);
    fixture.componentRef.setInput('kind', 'professional');
    fixture.componentRef.setInput('personId', '20');
    fixture.componentRef.setInput('name', 'Bruno');
    fixture.detectChanges();
  });

  const element = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(element().querySelectorAll('button')).find((candidate) => candidate.textContent!.trim().startsWith(text));

  function fillAndSend(): void {
    button('Denunciar')!.click();
    fixture.detectChanges();
    const select = element().querySelector('select') as HTMLSelectElement;
    select.value = 'fraude';
    select.dispatchEvent(new Event('change'));
    const textarea = element().querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Pediu pagamento por fora da plataforma.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button('Sim, enviar a denúncia')!.click();
    fixture.detectChanges();
  }

  it('paciente denuncia o profissional e depois é perguntado se quer bloquear também', () => {
    reportService.send.and.returnValue(of(undefined));

    fillAndSend();

    expect(reportService.send).toHaveBeenCalledWith('patient', '20', {
      reason: 'fraude',
      description: 'Pediu pagamento por fora da plataforma.',
      attachment: undefined,
    });
    expect(element().textContent).toContain('Quer bloquear Bruno também?');
    expect(button('Sim, bloquear o profissional')).toBeTruthy();
    expect(button('Não, só denunciar')).toBeTruthy();
  });

  it('aceitar bloquear abre o modal de bloqueio com o que muda', () => {
    reportService.send.and.returnValue(of(undefined));
    fillAndSend();

    button('Sim, bloquear o profissional')!.click();
    fixture.detectChanges();

    expect(userBlockService.preview).toHaveBeenCalledWith('professional', '20');
    expect(element().textContent).toContain('Bloquear Bruno?');
  });

  it('com denúncia pendente, o botão fica desabilitado como "Denúncia em andamento"', () => {
    fixture.componentRef.setInput('inProgress', true);
    fixture.detectChanges();

    const pending = button('Denúncia em andamento') as HTMLButtonElement;
    expect(pending).toBeTruthy();
    expect(pending.disabled).toBeTrue();
    expect(button('Denunciar')).toBeUndefined();
  });

  it('depois de enviar, o botão passa para "Denúncia em andamento"', () => {
    reportService.send.and.returnValue(of(undefined));

    fillAndSend();
    button('Não, só denunciar')!.click();
    fixture.detectChanges();

    expect((button('Denúncia em andamento') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('se a denúncia falha, mostra o erro e não pergunta do bloqueio', () => {
    reportService.send.and.returnValue(throwError(() => new Error('Só dá para denunciar quem já teve um atendimento com você.')));

    fillAndSend();

    expect(toast.error).toHaveBeenCalledWith('Só dá para denunciar quem já teve um atendimento com você.');
    expect(element().textContent).not.toContain('Quer bloquear Bruno também?');
  });
});
