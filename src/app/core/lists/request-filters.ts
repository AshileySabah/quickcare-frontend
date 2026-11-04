import { Signal } from '@angular/core';
import {
  REQUEST_STATUS_LABELS,
  RequestStatus,
  ServiceModality,
  ServiceRequest,
  requestedSpecialtyNames,
} from '../models';
import { FilterOption, ListSelectFilter, ListSort } from './list-filters';

export const MODALITY_OPTIONS: FilterOption[] = [
  { value: 'online', label: 'Online' },
  { value: 'presencial', label: 'Presencial' },
];

export function requestStatusFilter(statuses: RequestStatus[], allLabel: string): ListSelectFilter<ServiceRequest> {
  return {
    key: 'status',
    label: 'Status',
    allLabel,
    options: () => statuses.map((status) => ({ value: status, label: REQUEST_STATUS_LABELS[status] })),
    matches: (request, value) => request.status === value,
  };
}

export function modalityFilter<T>(modalityOf: (item: T) => ServiceModality): ListSelectFilter<T> {
  return {
    key: 'modality',
    label: 'Modalidade',
    allLabel: 'Todas',
    options: () => MODALITY_OPTIONS,
    matches: (item, value) => modalityOf(item) === value,
  };
}

export function requestCategoryFilter(requests: Signal<ServiceRequest[]>): ListSelectFilter<ServiceRequest> {
  return {
    key: 'category',
    label: 'Categoria',
    allLabel: 'Todas',
    options: () => {
      const labels = new Map<string, string>();
      requests().forEach((request) =>
        request.professionals.forEach((professional) => labels.set(professional.category, professional.categoryLabel)),
      );
      return [...labels].map(([value, label]) => ({ value, label }));
    },
    matches: (request, value) => request.professionals.some((professional) => professional.category === value),
  };
}

export function requestSpecialtyFilter(requests: Signal<ServiceRequest[]>): ListSelectFilter<ServiceRequest> {
  return {
    key: 'specialty',
    label: 'Especialidade',
    allLabel: 'Todas',
    options: () => {
      const names = new Map<string, string>();
      requests().forEach((request) =>
        request.professionals.forEach((professional) =>
          professional.specialties.forEach((specialty) => names.set(specialty.id, specialty.name)),
        ),
      );
      return [...names]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    matches: (request, value) =>
      request.professionals.some((professional) => professional.specialties.some((specialty) => specialty.id === value)),
  };
}

export const REQUEST_SORTS: Record<'recentes' | 'antigas' | 'prazo', ListSort<ServiceRequest>> = {
  recentes: { value: 'recentes', label: 'Mais recentes', compare: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  antigas: { value: 'antigas', label: 'Mais antigas', compare: (a, b) => a.createdAt.localeCompare(b.createdAt) },
  prazo: {
    value: 'prazo',
    label: 'Prazo mais próximo',
    compare: (a, b) => a.desiredDeadline.localeCompare(b.desiredDeadline),
  },
};

export function requestSearchText(request: ServiceRequest): string {
  return [
    request.id,
    request.description,
    ...request.professionals.map((professional) => `${professional.categoryLabel} ${requestedSpecialtyNames(professional)}`),
    request.address ? `${request.address.neighborhood} ${request.address.city}` : '',
  ].join(' ');
}
