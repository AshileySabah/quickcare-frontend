import { Specialty } from './specialty.model';
import { Address, ProfessionalCategory } from './user.model';

export type ServiceModality = 'presencial' | 'online';

export type RequestStatus =
  | 'aberta'
  | 'recebendo_propostas'
  | 'em_andamento'
  | 'concluida'
  | 'cancelada';

export interface RequestedProfessional {
  category: ProfessionalCategory;
  categoryLabel: string;
  specialties: Specialty[];
  quantity: number;
  filled: number;
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
  proposalCount: number;
  attendanceInProgress: boolean;
  nextAttendanceStart?: string;
  createdAt: string;
  updatedAt: string;
}

export function requestedSpecialtyNames(professional: RequestedProfessional): string {
  return professional.specialties.map((specialty) => specialty.name).join(' + ');
}

export function describeRequestedProfessional(professional: RequestedProfessional): string {
  return `${professional.quantity}× ${requestedSpecialtyNames(professional)}`;
}

export function requestedProfessionalsSummary(request: Pick<ServiceRequest, 'professionals'>): string {
  return request.professionals.map(describeRequestedProfessional).join(', ');
}

export function formatRequestAddress(address: Address): string {
  const complement = address.complement ? ` - ${address.complement}` : '';
  return `${address.street}, ${address.number}${complement} — ${address.neighborhood}, ${address.city}/${address.state}`;
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  aberta: 'Aberta',
  recebendo_propostas: 'Recebendo propostas',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};
