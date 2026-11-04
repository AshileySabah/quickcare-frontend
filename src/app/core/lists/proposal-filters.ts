import { PROPOSAL_STATUS_LABELS, Proposal, ProposalStatus, requestedProfessionalsSummary } from '../models';
import { ListSelectFilter, ListSort } from './list-filters';

export function proposalStatusFilter(statuses: ProposalStatus[]): ListSelectFilter<Proposal> {
  return {
    key: 'status',
    label: 'Status',
    allLabel: 'Todos',
    options: () => statuses.map((status) => ({ value: status, label: PROPOSAL_STATUS_LABELS[status] })),
    matches: (proposal, value) => proposal.status === value,
  };
}

export const PROPOSAL_SORTS: ListSort<Proposal>[] = [
  { value: 'recentes', label: 'Mais recentes', compare: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  { value: 'antigas', label: 'Mais antigas', compare: (a, b) => a.createdAt.localeCompare(b.createdAt) },
  { value: 'maior-valor', label: 'Maior valor', compare: (a, b) => b.price - a.price },
  { value: 'menor-valor', label: 'Menor valor', compare: (a, b) => a.price - b.price },
];

export function proposalSearchText(proposal: Proposal): string {
  return [proposal.request.patientName ?? '', requestedProfessionalsSummary(proposal.request), proposal.approach].join(' ');
}
