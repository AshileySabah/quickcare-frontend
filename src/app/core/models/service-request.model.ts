export type ServiceModality = 'presencial' | 'online';

export type RequestStatus =
  | 'aberta'
  | 'recebendo_propostas'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada';

export interface RequestAddress {
  street: string;
  city: string;
  state: string;
}

export interface ServiceRequest {
  id: string;
  patientId: string;
  specialtyId: string;
  description: string;
  modality: ServiceModality;
  address?: RequestAddress;
  desiredDeadline: string;
  status: RequestStatus;
  acceptedProposalId?: string;
  createdAt: string;
  updatedAt: string;
}
