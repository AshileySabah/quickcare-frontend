import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ProposalService } from './proposal.service';
import { RequestService } from './request.service';
import { Professional, Proposal, ServiceRequest } from '../models';

interface SubmitResult {
  proposal?: Proposal;
  error?: Error;
}

describe('ProposalService', () => {
  let proposalService: ProposalService;
  let requestService: RequestService;

  const approvedProfessional: Professional = {
    id: 'prof-test-approved',
    role: 'professional',
    name: 'Profissional Teste',
    email: 'prof.teste@example.com',
    phone: '(11) 90000-0000',
    cpf: '123.456.789-00',
    specialtyId: 'sp-nutricao',
    registrationNumber: 'CRN-TESTE',
    validationStatus: 'aprovado',
    validationDocument: {
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
      fileSizeBytes: 1000,
      uploadedAt: '2026-01-01T00:00:00Z',
      previewUrl: 'mock://doc.pdf',
    },
  };

  const pendingProfessional: Professional = {
    ...approvedProfessional,
    id: 'prof-test-pending',
    validationStatus: 'pendente',
  };

  const wrongSpecialtyProfessional: Professional = {
    ...approvedProfessional,
    id: 'prof-test-wrong-specialty',
    specialtyId: 'sp-psicologia',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    proposalService = TestBed.inject(ProposalService);
    requestService = TestBed.inject(RequestService);
  });

  function createOpenRequest(): ServiceRequest {
    let created!: ServiceRequest;

    requestService
      .create({
        patientId: 'pat-test',
        specialtyId: 'sp-nutricao',
        description: 'Solicitação de teste para a suíte automatizada de propostas.',
        modality: 'online',
        desiredDeadline: '2026-12-01',
      })
      .subscribe((request) => (created = request));
    tick(1000);

    return created;
  }

  function submitProposal(request: ServiceRequest, professional: Professional): SubmitResult {
    const result: SubmitResult = {};

    proposalService
      .submit({
        request,
        professional,
        price: 150,
        approach: 'Abordagem detalhada de teste automatizado.',
        deadline: '2026-12-10',
      })
      .subscribe({
        next: (proposal) => (result.proposal = proposal),
        error: (error: Error) => (result.error = error),
      });
    tick(1000);

    return result;
  }

  it('cria proposta pendente e move a solicitação para "recebendo_propostas"', fakeAsync(() => {
    const request = createOpenRequest();
    const { proposal } = submitProposal(request, approvedProfessional);

    expect(proposal?.status).toBe('pendente');

    const updatedRequest = requestService.requests().find((item) => item.id === request.id)!;
    expect(updatedRequest.status).toBe('recebendo_propostas');
  }));

  it('rejeita proposta de profissional não aprovado', fakeAsync(() => {
    const request = createOpenRequest();
    const { error } = submitProposal(request, pendingProfessional);

    expect(error?.message).toBe('Apenas profissionais validados podem enviar propostas.');
  }));

  it('rejeita proposta de profissional de especialidade diferente', fakeAsync(() => {
    const request = createOpenRequest();
    const { error } = submitProposal(request, wrongSpecialtyProfessional);

    expect(error?.message).toBe('Você só pode enviar propostas para solicitações da sua especialidade.');
  }));

  it('rejeita proposta para solicitação que não está mais recebendo propostas', fakeAsync(() => {
    const request = createOpenRequest();
    requestService.markInProgress(request.id, 'prop-fake');
    const inProgressRequest = requestService.requests().find((item) => item.id === request.id)!;

    const { error } = submitProposal(inProgressRequest, approvedProfessional);

    expect(error?.message).toBe('Esta solicitação não está mais recebendo propostas.');
  }));

  it('permite editar/cancelar apenas propostas pendentes', fakeAsync(() => {
    const request = createOpenRequest();
    const { proposal } = submitProposal(request, approvedProfessional);

    expect(proposalService.canEdit(proposal!)).toBe(true);
    expect(proposalService.canCancel(proposal!)).toBe(true);

    let cancelled!: Proposal;
    proposalService.cancel(proposal!.id).subscribe((result) => (cancelled = result));
    tick(1000);

    expect(cancelled.status).toBe('cancelada');
    expect(proposalService.canEdit(cancelled)).toBe(false);
    expect(proposalService.canCancel(cancelled)).toBe(false);
  }));

  it('rejeita update de proposta que não está mais pendente', fakeAsync(() => {
    const request = createOpenRequest();
    const { proposal } = submitProposal(request, approvedProfessional);

    proposalService.cancel(proposal!.id).subscribe();
    tick(1000);

    let error: Error | undefined;
    proposalService.update(proposal!.id, { price: 200 }).subscribe({ error: (err: Error) => (error = err) });
    tick(1000);

    expect(error?.message).toBe('Esta proposta não pode mais ser editada.');
  }));

  it(
    'ao aceitar uma proposta, recusa automaticamente as demais pendentes e move a solicitação para "em_andamento"',
    fakeAsync(() => {
      const request = createOpenRequest();
      const { proposal: firstProposal } = submitProposal(request, approvedProfessional);

      const secondProfessional: Professional = { ...approvedProfessional, id: 'prof-test-second' };
      const requestAfterFirst = requestService.requests().find((item) => item.id === request.id)!;
      const { proposal: secondProposal } = submitProposal(requestAfterFirst, secondProfessional);

      let accepted!: Proposal;
      proposalService.acceptProposal(firstProposal!.id).subscribe((result) => (accepted = result));
      tick(1000);

      expect(accepted.status).toBe('aceita');

      const refreshedSecond = proposalService.proposals().find((item) => item.id === secondProposal!.id)!;
      expect(refreshedSecond.status).toBe('recusada');

      const updatedRequest = requestService.requests().find((item) => item.id === request.id)!;
      expect(updatedRequest.status).toBe('em_andamento');
      expect(updatedRequest.acceptedProposalId).toBe(firstProposal!.id);
    }),
  );

  it('rejeita aceitar uma proposta que não está mais pendente', fakeAsync(() => {
    const request = createOpenRequest();
    const { proposal } = submitProposal(request, approvedProfessional);

    proposalService.cancel(proposal!.id).subscribe();
    tick(1000);

    let error: Error | undefined;
    proposalService.acceptProposal(proposal!.id).subscribe({ error: (err: Error) => (error = err) });
    tick(1000);

    expect(error?.message).toBe('Esta proposta não está mais disponível para aceite.');
  }));
});
