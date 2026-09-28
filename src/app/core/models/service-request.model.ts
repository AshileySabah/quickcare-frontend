import { Specialty } from './specialty.model';
import { Address, ProfessionalCategory } from './user.model';

export type ServiceModality = 'presencial' | 'online';

export type RequestStatus =
  | 'aberta'
  | 'recebendo_propostas'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada';

/**
 * Quantos profissionais de uma categoria a solicitação pede. Cada um deles
 * precisa atender TODAS as especialidades listadas.
 */
export interface RequestedProfessional {
  category: ProfessionalCategory;
  categoryLabel: string;
  specialties: Specialty[];
  quantity: number;
}

export interface ServiceRequest {
  id: string;
  patientId: string;
  professionals: RequestedProfessional[];
  description: string;
  modality: ServiceModality;
  address?: Address;
  desiredDeadline: string;
  status: RequestStatus;
  acceptedProposalId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Ex.: "Curativos + Sondagem". */
export function requestedSpecialtyNames(professional: RequestedProfessional): string {
  return professional.specialties.map((specialty) => specialty.name).join(' + ');
}

/** Ex.: "2× Curativos + Sondagem". */
export function describeRequestedProfessional(professional: RequestedProfessional): string {
  return `${professional.quantity}× ${requestedSpecialtyNames(professional)}`;
}

/** Ex.: "2× Curativos + Sondagem, 1× Cuidador de Idosos". */
export function requestedProfessionalsSummary(request: ServiceRequest): string {
  return request.professionals.map(describeRequestedProfessional).join(', ');
}

/** Ex.: "Av. Paulista, 1000 - Apto 12 — Bela Vista, São Paulo/SP". */
export function formatRequestAddress(address: Address): string {
  const complement = address.complement ? ` - ${address.complement}` : '';
  return `${address.street}, ${address.number}${complement} — ${address.neighborhood}, ${address.city}/${address.state}`;
}
