import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RequestStatus, ServiceRequest } from '../../../core/models';
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
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  };
}

describe('PatientHistoryComponent', () => {
  it('mostra só as solicitações encerradas (concluídas e canceladas), sem editar/cancelar', () => {
    const requests = [
      request('1', 'aberta'),
      request('2', 'concluida'),
      request('3', 'recebendo_propostas'),
      request('4', 'em_andamento'),
      request('5', 'cancelada'),
    ];

    TestBed.configureTestingModule({
      imports: [PatientHistoryComponent],
      providers: [provideRouter([]), { provide: RequestService, useValue: { list: () => of(requests) } }],
    });

    const fixture = TestBed.createComponent(PatientHistoryComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const ids = Array.from(element.querySelectorAll('.request-card__id')).map((item) => item.textContent!.trim());
    const buttons = Array.from(element.querySelectorAll('ui-button')).map((item) => item.textContent!.trim());

    expect(ids).toEqual(['#2', '#5']);
    expect(buttons.every((label) => label === 'Visualizar')).toBeTrue();
  });
});
