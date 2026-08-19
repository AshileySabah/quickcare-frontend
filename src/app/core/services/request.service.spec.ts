import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RequestService } from './request.service';
import { ServiceRequest } from '../models';

describe('RequestService', () => {
  let service: RequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RequestService);
  });

  function createRequest(): ServiceRequest {
    let created!: ServiceRequest;

    service
      .create({
        patientId: 'pat-test',
        specialtyId: 'sp-nutricao',
        description: 'Preciso de acompanhamento nutricional detalhado para o teste automatizado.',
        modality: 'online',
        desiredDeadline: '2026-12-01',
      })
      .subscribe((request) => (created = request));
    tick(1000);

    return created;
  }

  it('cria uma solicitação com status "aberta"', fakeAsync(() => {
    const request = createRequest();
    expect(request.status).toBe('aberta');
  }));

  it('permite editar enquanto está aberta ou recebendo propostas', fakeAsync(() => {
    const request = createRequest();
    expect(service.canEdit(request)).toBe(true);

    service.markReceivingProposals(request.id);
    const updated = service.requests().find((item) => item.id === request.id)!;
    expect(service.canEdit(updated)).toBe(true);
  }));

  it('bloqueia edição depois que a solicitação entra em andamento', fakeAsync(() => {
    const request = createRequest();
    service.markInProgress(request.id, 'prop-fake');
    const inProgress = service.requests().find((item) => item.id === request.id)!;

    expect(service.canEdit(inProgress)).toBe(false);
  }));

  it('rejeita update quando a solicitação não é mais editável', fakeAsync(() => {
    const request = createRequest();
    service.markInProgress(request.id, 'prop-fake');

    let error: Error | undefined;
    service.update(request.id, { description: 'nova descrição' }).subscribe({
      error: (err: Error) => (error = err),
    });
    tick(1000);

    expect(error?.message).toBe('Esta solicitação não pode mais ser editada.');
  }));

  it('permite cancelar enquanto não está concluída', fakeAsync(() => {
    const request = createRequest();

    let cancelled!: ServiceRequest;
    service.cancel(request.id).subscribe((result) => (cancelled = result));
    tick(1000);

    expect(cancelled.status).toBe('cancelada');
  }));

  it('bloqueia cancelamento de solicitação já concluída', fakeAsync(() => {
    const request = createRequest();
    service.markInProgress(request.id, 'prop-fake');

    service.complete(request.id).subscribe();
    tick(1000);

    let error: Error | undefined;
    service.cancel(request.id).subscribe({ error: (err: Error) => (error = err) });
    tick(1000);

    expect(error?.message).toBe('Esta solicitação não pode mais ser cancelada.');
  }));

  it('só marca como "concluída" solicitações em andamento', fakeAsync(() => {
    const request = createRequest();

    let error: Error | undefined;
    service.complete(request.id).subscribe({ error: (err: Error) => (error = err) });
    tick(1000);

    expect(error?.message).toBe('Apenas solicitações em andamento podem ser concluídas.');
  }));

  it('markReceivingProposals só transiciona a partir de "aberta"', fakeAsync(() => {
    const request = createRequest();

    service.markReceivingProposals(request.id);
    let updated = service.requests().find((item) => item.id === request.id)!;
    expect(updated.status).toBe('recebendo_propostas');

    service.cancel(request.id).subscribe();
    tick(1000);

    service.markReceivingProposals(request.id);
    updated = service.requests().find((item) => item.id === request.id)!;
    expect(updated.status).toBe('cancelada');
  }));

  it('listOpenForSpecialty retorna só solicitações abertas/recebendo propostas da especialidade', fakeAsync(() => {
    const request = createRequest();

    let results: ServiceRequest[] = [];
    service.listOpenForSpecialty('sp-nutricao').subscribe((requests) => (results = requests));
    tick(1000);

    expect(results.some((item) => item.id === request.id)).toBe(true);

    service.markInProgress(request.id, 'prop-fake');

    service.listOpenForSpecialty('sp-nutricao').subscribe((requests) => (results = requests));
    tick(1000);

    expect(results.some((item) => item.id === request.id)).toBe(false);
  }));
});
