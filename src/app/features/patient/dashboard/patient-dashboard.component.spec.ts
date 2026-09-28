import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Proposal, ServiceRequest } from '../../../core/models';
import { ProposalService } from '../../../core/services/proposal.service';
import { RequestService } from '../../../core/services/request.service';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { PatientDashboardComponent } from './patient-dashboard.component';

function request(overrides: Partial<ServiceRequest>): ServiceRequest {
  return {
    id: '1',
    patientId: '1',
    professionals: [
      {
        category: 'ENFERMEIRO',
        categoryLabel: 'Enfermeiro(a)',
        specialties: [{ id: '23', name: 'Curativos', category: 'ENFERMEIRO' }],
        quantity: 2,
      },
    ],
    description: 'Preciso de curativos diários para minha mãe.',
    modality: 'presencial',
    desiredDeadline: '2026-12-01',
    status: 'aberta',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

const REQUESTS: ServiceRequest[] = [
  request({ id: '1', status: 'aberta', createdAt: '2026-09-01T10:00:00Z' }),
  request({
    id: '2',
    status: 'em_andamento',
    modality: 'online',
    description: 'Acompanhamento nutricional online.',
    professionals: [
      {
        category: 'OUTRO',
        categoryLabel: 'Outros profissionais',
        specialties: [{ id: '31', name: 'Nutrição', category: 'OUTRO' }],
        quantity: 1,
      },
    ],
    createdAt: '2026-09-10T10:00:00Z',
  }),
  request({ id: '3', status: 'cancelada', createdAt: '2026-08-01T10:00:00Z' }),
];

describe('PatientDashboardComponent', () => {
  let fixture: ComponentFixture<PatientDashboardComponent>;
  let requestService: jasmine.SpyObj<RequestService>;

  const cardIds = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.request-card__id') as NodeListOf<HTMLElement>).map((element) =>
      element.textContent!.trim(),
    );

  beforeEach(() => {
    requestService = jasmine.createSpyObj<RequestService>('RequestService', ['list', 'cancel', 'canEdit', 'canCancel']);
    requestService.list.and.returnValue(of(REQUESTS));
    requestService.canEdit.and.callFake((item) => ['aberta', 'recebendo_propostas'].includes(item.status));
    requestService.canCancel.and.callFake((item) => item.status !== 'concluida' && item.status !== 'cancelada');

    const proposals: Proposal[] = [
      { id: 'p1', requestId: '1', professionalId: 'a', price: 1, approach: '', deadline: '', status: 'pendente', createdAt: '', updatedAt: '' },
      { id: 'p2', requestId: '1', professionalId: 'b', price: 1, approach: '', deadline: '', status: 'pendente', createdAt: '', updatedAt: '' },
      { id: 'p3', requestId: '1', professionalId: 'c', price: 1, approach: '', deadline: '', status: 'cancelada', createdAt: '', updatedAt: '' },
    ];

    TestBed.configureTestingModule({
      imports: [PatientDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: RequestService, useValue: requestService },
        { provide: ProposalService, useValue: { proposals: signal(proposals) } },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['info', 'error', 'success']) },
      ],
    });

    fixture = TestBed.createComponent(PatientDashboardComponent);
    fixture.detectChanges();
  });

  it('mostra só as ativas por padrão, das mais recentes para as mais antigas', () => {
    expect(cardIds()).toEqual(['#2', '#1']);
  });

  it('filtra por busca sem diferenciar acentos', () => {
    const component = fixture.componentInstance as unknown as { filters: { patchValue(value: object): void } };
    component.filters.patchValue({ search: 'nutricao' });
    fixture.detectChanges();

    expect(cardIds()).toEqual(['#2']);
  });

  it('conta profissionais distintos com proposta não cancelada', () => {
    const card = fixture.nativeElement.querySelectorAll('app-request-card')[1] as HTMLElement;
    expect(card.querySelector('.request-card__proposals-link')?.textContent?.trim()).toBe('2');
  });

  it('pede confirmação antes de cancelar e só cancela ao confirmar', () => {
    requestService.cancel.and.callFake((id) => of({ ...REQUESTS.find((item) => item.id === id)!, status: 'cancelada' }));

    const cancelButton = Array.from(fixture.nativeElement.querySelectorAll('ui-button') as NodeListOf<HTMLElement>).find(
      (button) => button.textContent!.trim() === 'Cancelar',
    )!;
    cancelButton.querySelector('button')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(requestService.cancel).not.toHaveBeenCalled();

    const confirmButton = Array.from(fixture.nativeElement.querySelectorAll('[role="dialog"] ui-button') as NodeListOf<HTMLElement>).find(
      (button) => button.textContent!.trim() === 'Sim, cancelar',
    )!;
    confirmButton.querySelector('button')!.click();
    fixture.detectChanges();

    expect(requestService.cancel).toHaveBeenCalledWith('2');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(cardIds()).toEqual(['#1']);
  });
});
