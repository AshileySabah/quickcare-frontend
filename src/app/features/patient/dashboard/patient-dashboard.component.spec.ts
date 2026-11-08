import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { of } from 'rxjs';
import { ServiceRequest } from '../../../core/models';
import { CreationLock, CreationLockService } from '../../../core/services/creation-lock.service';
import { OccurrenceService } from '../../../core/services/occurrence.service';
import { RatingService } from '../../../core/services/rating.service';
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
        filled: 0,
      },
    ],
    description: 'Preciso de curativos diários para minha mãe.',
    modality: 'presencial',
    desiredDeadline: '2026-12-01',
    status: 'aberta',
    proposalCount: 0,
    attendanceInProgress: false,
    practiceAreasForProposal: [],
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...overrides,
  };
}

const REQUESTS: ServiceRequest[] = [
  request({ id: '1', status: 'aberta', proposalCount: 2, createdAt: '2026-09-01T10:00:00Z' }),
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
        filled: 1,
      },
    ],
    createdAt: '2026-09-10T10:00:00Z',
  }),
  request({ id: '3', status: 'cancelada', createdAt: '2026-08-01T10:00:00Z' }),
];

describe('PatientDashboardComponent', () => {
  let fixture: ComponentFixture<PatientDashboardComponent>;
  let requestService: jasmine.SpyObj<RequestService>;
  const lock = signal<CreationLock | null>(null);

  const cardIds = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.request-card__id') as NodeListOf<HTMLElement>).map((element) =>
      element.textContent!.trim(),
    );

  beforeEach(() => {
    requestService = jasmine.createSpyObj<RequestService>('RequestService', ['list', 'cancel', 'canEdit', 'canCancel']);
    requestService.list.and.returnValue(of(REQUESTS));
    requestService.canEdit.and.callFake((item) => ['aberta', 'recebendo_propostas'].includes(item.status));
    requestService.canCancel.and.callFake((item) => item.status !== 'concluida' && item.status !== 'cancelada');

    TestBed.configureTestingModule({
      imports: [PatientDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: RequestService, useValue: requestService },
        {
          provide: OccurrenceService,
          useValue: { summary: () => of({ counting: 0, limit: 3, windowDays: 90, occurrences: [] }) },
        },
        { provide: RatingService, useValue: { pending: () => of({ pending: [], highlights: [] }) } },
        { provide: CreationLockService, useValue: { lockFor: () => lock } },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['info', 'error', 'success']) },
        {
          provide: AuthService,
          useValue: { currentUser: signal({ role: 'patient', validationStatus: 'aprovado' }) },
        },
      ],
    });

    lock.set(null);
    fixture = TestBed.createComponent(PatientDashboardComponent);
    fixture.detectChanges();
  });

  function newRequestButton(): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('ui-button button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent!.includes('Nova solicitação'),
    )!;
  }

  it('em revalidação, avisa e desabilita "Nova solicitação"', () => {
    lock.set({ reason: 'revalidation' });
    fixture.detectChanges();

    expect(newRequestButton().disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Seus dados estão em revalidação');
  });

  it('mostra só as ativas por padrão, das mais recentes para as mais antigas', () => {
    expect(cardIds()).toEqual(['#2', '#1']);
  });

  it('filtra por busca sem diferenciar acentos', () => {
    const component = fixture.componentInstance as unknown as { filters: { form: { patchValue(value: object): void } } };
    component.filters.form.patchValue({ search: 'nutricao' });
    fixture.detectChanges();

    expect(cardIds()).toEqual(['#2']);
  });

  it('mostra o total de propostas recebidas informado pela API', () => {
    const card = fixture.nativeElement.querySelectorAll('app-request-card')[1] as HTMLElement;
    const proposals = Array.from(card.querySelectorAll('.request-card__fact') as NodeListOf<HTMLElement>).find((fact) =>
      fact.textContent?.includes('Propostas'),
    );
    expect(proposals?.querySelector('.request-card__fact-value')?.textContent?.trim().startsWith('2')).toBeTrue();
    expect(proposals?.querySelector('a')).toBeNull();
  });

  function cancelButtonOf(cardId: string): HTMLButtonElement {
    const card = Array.from(fixture.nativeElement.querySelectorAll('app-request-card') as NodeListOf<HTMLElement>).find(
      (element) => element.querySelector('.request-card__id')?.textContent?.trim() === cardId,
    )!;
    const button = Array.from(card.querySelectorAll('ui-button') as NodeListOf<HTMLElement>).find(
      (element) => element.textContent!.trim() === 'Cancelar',
    )!;
    return button.querySelector('button')!;
  }

  it('cancela direto, sem modal, quando nenhuma proposta foi aceita', () => {
    requestService.cancel.and.callFake((id) => of({ ...REQUESTS.find((item) => item.id === id)!, status: 'cancelada' }));

    cancelButtonOf('#1').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(requestService.cancel).toHaveBeenCalledWith('1');
    expect(cardIds()).toEqual(['#2']);
  });

  it('com proposta aceita, pede confirmação e só cancela ao confirmar', () => {
    requestService.cancel.and.callFake((id) => of({ ...REQUESTS.find((item) => item.id === id)!, status: 'cancelada' }));

    cancelButtonOf('#2').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(requestService.cancel).not.toHaveBeenCalled();

    const confirmButton = Array.from(fixture.nativeElement.querySelectorAll('[role="dialog"] ui-button') as NodeListOf<HTMLElement>).find(
      (button) => button.textContent!.trim() === 'Sim, cancelar a solicitação',
    )!;
    confirmButton.querySelector('button')!.click();
    fixture.detectChanges();

    expect(requestService.cancel).toHaveBeenCalledWith('2');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(cardIds()).toEqual(['#1']);
  });
});
