import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { Attendance, AttendanceProblem } from '../../../core/models';
import { AttendanceViewer } from '../../../core/services/attendance.service';
import { AttendanceProblemComponent } from './attendance-problem.component';

function problem(overrides: Partial<AttendanceProblem> = {}): AttendanceProblem {
  return {
    id: '1',
    status: 'aguardando_resposta',
    reportedBy: 'paciente',
    reason: 'outro_nao_compareceu',
    description: 'O profissional não apareceu no horário.',
    createdAt: '2026-11-01T12:00:00Z',
    answerDeadline: '2026-11-08T12:00:00Z',
    attachments: [],
    ...overrides,
  };
}

function attendance(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: '900',
    status: 'finalizado',
    start: '2026-11-01T11:00:00Z',
    end: '2026-11-01T21:00:00Z',
    acceptedAt: '2026-10-20T12:00:00Z',
    cancellationCountsAsOccurrence: false,
    lateChange: false,
    canReportProblem: true,
    ...overrides,
  };
}

describe('AttendanceProblemComponent', () => {
  function render(value: Attendance, viewer: AttendanceViewer) {
    TestBed.configureTestingModule({
      imports: [AttendanceProblemComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(AttendanceProblemComponent);
    fixture.componentRef.setInput('attendance', value);
    fixture.componentRef.setInput('viewer', viewer);
    fixture.componentRef.setInput('counterpartName', 'Carla');
    fixture.detectChanges();
    return fixture;
  }

  function buttons(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll('ui-button-group ui-button')).map((item) => item.textContent!.trim());
  }

  it('sem relato, dentro da janela: oferece "Não foi realizado"', () => {
    const element = render(attendance(), 'patient').nativeElement as HTMLElement;
    expect(buttons(element)).toEqual(['Não foi realizado']);
  });

  it('quem relatou aguarda; o outro lado confirma ou contesta', () => {
    const reported = attendance({ status: 'problema_relatado', canReportProblem: false, problem: problem() });

    const patient = render(reported, 'patient').nativeElement as HTMLElement;
    expect(buttons(patient)).toEqual([]);
    expect(patient.textContent).toContain('Aguardando Carla responder');

    TestBed.resetTestingModule();
    const professional = render(reported, 'professional').nativeElement as HTMLElement;
    expect(buttons(professional)).toEqual(['Confirmar que não foi realizado', 'Contestar']);
    expect(professional.textContent).toContain('conta uma ocorrência para você');
  });

  it('sem resposta no prazo: ainda dá para contestar com o administrador', () => {
    const expired = attendance({
      status: 'nao_realizado',
      canReportProblem: false,
      problem: problem({ status: 'sem_resposta' }),
    });

    const element = render(expired, 'professional').nativeElement as HTMLElement;

    expect(buttons(element)).toEqual(['Contestar com o administrador']);
  });

  it('decidido: mostra a decisão e a justificativa, sem ações', () => {
    const decided = attendance({
      status: 'concluido',
      canReportProblem: false,
      problem: problem({ status: 'decidido', decision: 'realizado', decisionJustification: 'As fotos mostram o atendimento.' }),
    });

    const element = render(decided, 'patient').nativeElement as HTMLElement;

    expect(buttons(element)).toEqual([]);
    expect(element.textContent).toContain('decidiu que o atendimento foi realizado');
    expect(element.textContent).toContain('As fotos mostram o atendimento.');
  });

  it('confirmar chama a API e avisa quem usa', () => {
    const fixture = render(
      attendance({ status: 'problema_relatado', canReportProblem: false, problem: problem() }),
      'professional',
    );
    const httpMock = TestBed.inject(HttpTestingController);
    const changed = jasmine.createSpy('changed');
    fixture.componentInstance.changed.subscribe(changed);

    (fixture.componentInstance as unknown as { confirm(): void }).confirm();
    httpMock.expectOne(`${environment.apiUrl}/atendimentos/900/problema/confirmar`).flush({
      id: 900,
      status: 'NAO_REALIZADO',
      inicio: '2026-11-01T11:00:00Z',
      termino: '2026-11-01T21:00:00Z',
      aceitoEm: '2026-10-20T12:00:00Z',
      cancelamentoContaOcorrencia: false,
      alteracaoTardia: false,
      podeRelatarProblema: false,
      problema: {
        id: 1,
        status: 'CONFIRMADO',
        relatadoPor: 'PACIENTE',
        motivo: 'OUTRO_NAO_COMPARECEU',
        descricao: 'O profissional não apareceu no horário.',
        criadoEm: '2026-11-01T12:00:00Z',
        prazoResposta: '2026-11-08T12:00:00Z',
        anexos: [],
      },
    });

    expect(changed).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'nao_realizado' }));
  });
});
