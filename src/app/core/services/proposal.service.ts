import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Professional, Proposal, ServiceRequest } from '../models';
import { PROPOSALS_MOCK } from '../../mocks';
import { RequestService } from './request.service';
import { simulateNetwork } from './simulate-network.util';

export interface SubmitProposalInput {
  request: ServiceRequest;
  professional: Professional;
  price: number;
  approach: string;
  deadline: string;
}

export interface UpdateProposalInput {
  price?: number;
  approach?: string;
  deadline?: string;
}

@Injectable({ providedIn: 'root' })
export class ProposalService {
  private readonly requestService = inject(RequestService);

  private readonly proposalsSignal = signal<Proposal[]>([...PROPOSALS_MOCK]);
  readonly proposals = this.proposalsSignal.asReadonly();

  canEdit(proposal: Proposal): boolean {
    return proposal.status === 'pendente';
  }

  canCancel(proposal: Proposal): boolean {
    return proposal.status === 'pendente';
  }

  listForRequest(requestId: string, simulateError = false): Observable<Proposal[]> {
    return simulateNetwork(() => this.proposalsSignal().filter((proposal) => proposal.requestId === requestId), {
      simulateError,
      errorMessage: 'Não foi possível carregar as propostas.',
    });
  }

  listForProfessional(professionalId: string, simulateError = false): Observable<Proposal[]> {
    return simulateNetwork(
      () => this.proposalsSignal().filter((proposal) => proposal.professionalId === professionalId),
      { simulateError, errorMessage: 'Não foi possível carregar suas propostas.' },
    );
  }

  getById(id: string, simulateError = false): Observable<Proposal | undefined> {
    return simulateNetwork(() => this.proposalsSignal().find((proposal) => proposal.id === id), {
      simulateError,
      errorMessage: 'Não foi possível carregar a proposta.',
    });
  }

  submit(input: SubmitProposalInput): Observable<Proposal> {
    return simulateNetwork(() => {
      if (input.professional.validationStatus !== 'aprovado') {
        throw new Error('Apenas profissionais validados podem enviar propostas.');
      }

      if (input.professional.specialtyId !== input.request.specialtyId) {
        throw new Error('Você só pode enviar propostas para solicitações da sua especialidade.');
      }

      if (!this.requestService.canReceiveProposals(input.request)) {
        throw new Error('Esta solicitação não está mais recebendo propostas.');
      }

      const now = new Date().toISOString();
      const proposal: Proposal = {
        id: `prop-${crypto.randomUUID()}`,
        requestId: input.request.id,
        professionalId: input.professional.id,
        price: input.price,
        approach: input.approach,
        deadline: input.deadline,
        status: 'pendente',
        createdAt: now,
        updatedAt: now,
      };

      this.proposalsSignal.update((proposals) => [...proposals, proposal]);
      this.requestService.markReceivingProposals(input.request.id);

      return proposal;
    });
  }

  update(id: string, patch: UpdateProposalInput): Observable<Proposal> {
    return simulateNetwork(() => {
      const proposal = this.proposalsSignal().find((item) => item.id === id);

      if (!proposal) {
        throw new Error('Proposta não encontrada.');
      }

      if (!this.canEdit(proposal)) {
        throw new Error('Esta proposta não pode mais ser editada.');
      }

      const updated: Proposal = { ...proposal, ...patch, updatedAt: new Date().toISOString() };
      this.proposalsSignal.update((proposals) => proposals.map((item) => (item.id === id ? updated : item)));

      return updated;
    });
  }

  cancel(id: string): Observable<Proposal> {
    return simulateNetwork(() => {
      const proposal = this.proposalsSignal().find((item) => item.id === id);

      if (!proposal) {
        throw new Error('Proposta não encontrada.');
      }

      if (!this.canCancel(proposal)) {
        throw new Error('Esta proposta não pode mais ser cancelada.');
      }

      const updated: Proposal = { ...proposal, status: 'cancelada', updatedAt: new Date().toISOString() };
      this.proposalsSignal.update((proposals) => proposals.map((item) => (item.id === id ? updated : item)));

      return updated;
    });
  }

  acceptProposal(id: string): Observable<Proposal> {
    return simulateNetwork(() => {
      const proposal = this.proposalsSignal().find((item) => item.id === id);

      if (!proposal) {
        throw new Error('Proposta não encontrada.');
      }

      if (proposal.status !== 'pendente') {
        throw new Error('Esta proposta não está mais disponível para aceite.');
      }

      const now = new Date().toISOString();

      this.proposalsSignal.update((proposals) =>
        proposals.map((item) => {
          if (item.id === id) {
            return { ...item, status: 'aceita', updatedAt: now };
          }

          if (item.requestId === proposal.requestId && item.status === 'pendente') {
            return { ...item, status: 'recusada', updatedAt: now };
          }

          return item;
        }),
      );

      this.requestService.markInProgress(proposal.requestId, id);

      return { ...proposal, status: 'aceita', updatedAt: now };
    });
  }
}
