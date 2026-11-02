import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Block, RequestStatus, ServiceRequest } from '../../../core/models';
import { OccurrenceService } from '../../../core/services/occurrence.service';
import { RequestService } from '../../../core/services/request.service';
import { PatientHistoryComponent } from './patient-history.component';

function request(id: string, status: RequestStatus): ServiceRequest {
  return {
    id,
    patientId: '1',
    professionals: [],
    description: 'Descrição de teste.',
    modality: 'online',
    desiredDeadline: '2026-12-01',
    status,
    proposalCount: 0,
    attendanceInProgress: false,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  };
}

describe('PatientHistoryComponent', () => {
  function render(requests: ServiceRequest[], block: Block | null = null): HTMLElement {
    TestBed.configureTestingModule({
      imports: [PatientHistoryComponent],
      providers: [
        provideRouter([]),
        { provide: RequestService, useValue: { list: () => of(requests) } },
        { provide: OccurrenceService, useValue: { blockFor: () => signal(block) } },
      ],
    });
    const fixture = TestBed.createComponent(PatientHistoryComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra só as solicitações encerradas (concluídas e canceladas), sem editar/cancelar, com reabrir solicitação', () => {
    const requests = [
      request('1', 'aberta'),
      request('2', 'concluida'),
      request('3', 'recebendo_propostas'),
      request('4', 'em_andamento'),
      request('5', 'cancelada'),
    ];

    const element = render(requests);
    const ids = Array.from(element.querySelectorAll('.request-card__id')).map((item) => item.textContent!.trim());
    const buttons = Array.from(element.querySelectorAll('ui-button')).map((item) => item.textContent!.trim());

    expect(ids).toEqual(['#2', '#5']);
    expect(buttons).toEqual(['Visualizar', 'Reabrir solicitação', 'Visualizar', 'Reabrir solicitação']);
  });

  it('bloqueado por ocorrências, "Reabrir solicitação" fica desabilitado', () => {
    const block: Block = { id: '9', level: 1, start: '2026-11-01T12:00:00Z', end: '2026-11-08T12:00:00Z', active: true, undone: false };
    const element = render([request('2', 'concluida')], block);

    const reopen = Array.from(element.querySelectorAll('ui-button button')).find((button) =>
      button.textContent!.includes('Reabrir solicitação'),
    ) as HTMLButtonElement;
    expect(reopen.disabled).toBeTrue();
  });
});
