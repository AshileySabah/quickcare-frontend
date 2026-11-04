import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminProposalSummary } from '../../../core/models';
import { AdminProposalService } from '../../../core/services/admin/admin-proposal.service';
import { AdminProposalsComponent } from './admin-proposals.component';

function proposal(overrides: Partial<AdminProposalSummary>): AdminProposalSummary {
  return {
    id: '1',
    status: 'pendente',
    requestId: '10',
    requestStatus: 'recebendo_propostas',
    service: 'Curativos',
    patient: { userId: '3', name: 'Paciente', email: 'p@x' },
    professional: { userId: '2', name: 'Carla', email: 'c@x' },
    price: 150,
    start: '2026-12-01T11:00:00Z',
    end: '2026-12-01T19:00:00Z',
    allowedActions: ['recusar'],
    createdAt: '2026-11-01T12:00:00Z',
    ...overrides,
  };
}

describe('AdminProposalsComponent', () => {
  it('mostra só as ações permitidas de cada proposta e confirma com justificativa', () => {
    const changeStatus = jasmine
      .createSpy('changeStatus')
      .and.returnValue(of(proposal({ id: '2', status: 'pendente', allowedActions: ['recusar'] })));
    TestBed.configureTestingModule({
      imports: [AdminProposalsComponent],
      providers: [
        provideRouter([]),
        {
          provide: AdminProposalService,
          useValue: {
            list: () =>
              of([
                proposal({ id: '1', status: 'pendente', allowedActions: ['recusar'] }),
                proposal({ id: '2', status: 'recusada', allowedActions: ['reativar'] }),
                proposal({ id: '3', status: 'aceita', allowedActions: [] }),
              ]),
            changeStatus,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AdminProposalsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    const buttonsPerCard = Array.from(element.querySelectorAll('.admin-proposals__list ui-card')).map((card) =>
      Array.from(card.querySelectorAll('ui-button')).map((button) => button.textContent!.trim()),
    );
    expect(buttonsPerCard).toEqual([['Recusar'], ['Reativar'], []]);

    const component = fixture.componentInstance as unknown as {
      pending: { set(value: unknown): void };
      confirm(justification: string): void;
    };
    component.pending.set({ proposal: proposal({ id: '2', status: 'recusada' }), action: 'reativar' });
    component.confirm('Recusada por engano.');

    expect(changeStatus).toHaveBeenCalledWith('2', 'reativar', 'Recusada por engano.');
  });
});
