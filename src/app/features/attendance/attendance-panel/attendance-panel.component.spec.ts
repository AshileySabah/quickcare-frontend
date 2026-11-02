import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Attendance } from '../../../core/models';
import { AttendanceViewer } from '../../../core/services/attendance.service';
import { AttendancePanelComponent } from './attendance-panel.component';

function attendance(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: '900',
    status: 'agendado',
    start: '2026-11-20T11:00:00Z',
    end: '2026-11-20T21:00:00Z',
    acceptedAt: '2026-11-01T12:00:00Z',
    cancellationCountsAsOccurrence: false,
    lateChange: false,
    ...overrides,
  };
}

describe('AttendancePanelComponent', () => {
  function render(value: Attendance, viewer: AttendanceViewer) {
    TestBed.configureTestingModule({
      imports: [AttendancePanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AttendancePanelComponent);
    fixture.componentRef.setInput('attendance', value);
    fixture.componentRef.setInput('viewer', viewer);
    fixture.componentRef.setInput('counterpartName', 'Carla');
    fixture.detectChanges();
    return fixture;
  }

  function buttons(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll('.attendance-panel ui-button')).map((item) => item.textContent!.trim());
  }

  it('agendado: remarcar e cancelar, sem botão de iniciar ou finalizar', () => {
    const element = render(attendance(), 'patient').nativeElement as HTMLElement;

    expect(buttons(element)).toEqual(['Remarcar', 'Cancelar atendimento']);
  });

  it('quem não pediu a remarcação responde; quem pediu aguarda', () => {
    const reschedule = {
      start: '2026-11-22T11:00:00Z',
      end: '2026-11-22T21:00:00Z',
      requestedBy: 'paciente' as const,
      requestedAt: '2026-11-02T12:00:00Z',
    };

    const professional = render(attendance({ reschedule }), 'professional').nativeElement as HTMLElement;
    expect(buttons(professional)).toContain('Aceitar remarcação');
    expect(professional.textContent).toContain('O paciente pediu para remarcar');

    TestBed.resetTestingModule();
    const patient = render(attendance({ reschedule }), 'patient').nativeElement as HTMLElement;
    expect(buttons(patient)).not.toContain('Aceitar remarcação');
    expect(patient.textContent).toContain('Aguardando a resposta');
  });

  it('aguardando reaceite: o profissional reaceita ou recusa; o paciente é avisado da troca tardia', () => {
    const professional = render(attendance({ status: 'aguardando_reaceite' }), 'professional')
      .nativeElement as HTMLElement;
    expect(buttons(professional)).toEqual(['Reaceitar', 'Recusar nova versão']);

    TestBed.resetTestingModule();
    const patient = render(attendance({ status: 'aguardando_reaceite', lateChange: true }), 'patient')
      .nativeElement as HTMLElement;
    expect(buttons(patient)).toEqual([]);
    expect(patient.textContent).toContain('conta como ocorrência');
  });

  it('reaceitar chama a API e avisa quem usa', () => {
    const fixture = render(attendance({ status: 'aguardando_reaceite' }), 'professional');
    const httpMock = TestBed.inject(HttpTestingController);
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.changed.subscribe(changed);

    (fixture.nativeElement.querySelector('.attendance-panel ui-button') as HTMLElement).click();
    httpMock.expectOne(`${environment.apiUrl}/atendimentos/900/reaceitar`).flush({
      id: 900,
      status: 'AGENDADO',
      inicio: '2026-11-20T11:00:00Z',
      termino: '2026-11-20T21:00:00Z',
      aceitoEm: '2026-11-02T12:00:00Z',
      cancelamentoContaOcorrencia: false,
      alteracaoTardia: false,
    });

    expect(changed).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'agendado' }));
  });
});
