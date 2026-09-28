import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { RequestStatus, ServiceRequest, requestedSpecialtyNames } from '../../../core/models';
import { ProposalService } from '../../../core/services/proposal.service';
import { RequestService } from '../../../core/services/request.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonComponent } from '../../../shared/ui/feedback/skeleton/skeleton.component';
import { ToastService } from '../../../shared/ui/feedback/toast/toast.service';
import { InputComponent } from '../../../shared/ui/forms/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/ui/forms/select/select.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { ModalComponent } from '../../../shared/ui/layout/modal/modal.component';
import { RequestCardComponent } from './request-card/request-card.component';

type ViewState = 'loading' | 'empty' | 'error' | 'filled';
type StatusFilter = 'ativas' | 'todas' | RequestStatus;
type SortOrder = 'recentes' | 'antigas' | 'prazo';

const ACTIVE_STATUSES: RequestStatus[] = ['aberta', 'recebendo_propostas', 'em_andamento'];

const DEFAULT_FILTERS = {
  search: '',
  status: 'ativas' as StatusFilter,
  modality: '',
  category: '',
  sort: 'recentes' as SortOrder,
};

/** Minúsculas e sem acento, para a busca ignorar "Nutrição" vs "nutricao". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    InputComponent,
    ModalComponent,
    RequestCardComponent,
    SelectComponent,
    SkeletonComponent,
  ],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.scss',
})
export class PatientDashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly requestService = inject(RequestService);
  private readonly proposalService = inject(ProposalService);
  private readonly toastService = inject(ToastService);

  protected readonly viewState = signal<ViewState>('loading');
  protected readonly requests = signal<ServiceRequest[]>([]);

  protected readonly requestToCancel = signal<ServiceRequest | null>(null);
  protected readonly isCancelling = signal(false);

  protected readonly filters = this.fb.nonNullable.group({ ...DEFAULT_FILTERS });
  private readonly filterValues = toSignal(this.filters.valueChanges.pipe(map(() => this.filters.getRawValue())), {
    initialValue: this.filters.getRawValue(),
  });

  protected readonly statusOptions: SelectOption[] = [
    { value: 'ativas', label: 'Ativas' },
    { value: 'todas', label: 'Todas' },
    { value: 'aberta', label: 'Aberta' },
    { value: 'recebendo_propostas', label: 'Recebendo propostas' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  protected readonly modalityOptions: SelectOption[] = [
    { value: 'online', label: 'Online' },
    { value: 'presencial', label: 'Presencial' },
  ];

  protected readonly sortOptions: SelectOption[] = [
    { value: 'recentes', label: 'Mais recentes' },
    { value: 'antigas', label: 'Mais antigas' },
    { value: 'prazo', label: 'Prazo mais próximo' },
  ];

  /** Só as categorias que aparecem nas solicitações do paciente. */
  protected readonly categoryOptions = computed<SelectOption[]>(() => {
    const labels = new Map<string, string>();
    for (const request of this.requests()) {
      for (const professional of request.professionals) {
        labels.set(professional.category, professional.categoryLabel);
      }
    }
    return [...labels].map(([value, label]) => ({ value, label }));
  });

  /** Profissionais distintos com proposta (não cancelada) por solicitação. */
  private readonly proposalCountByRequest = computed(() => {
    const professionalsByRequest = new Map<string, Set<string>>();
    for (const proposal of this.proposalService.proposals()) {
      if (proposal.status === 'cancelada') continue;
      const professionals = professionalsByRequest.get(proposal.requestId) ?? new Set<string>();
      professionals.add(proposal.professionalId);
      professionalsByRequest.set(proposal.requestId, professionals);
    }
    return new Map([...professionalsByRequest].map(([requestId, professionals]) => [requestId, professionals.size]));
  });

  protected readonly filteredRequests = computed(() => {
    const { search, status, modality, category, sort } = this.filterValues();
    const term = normalize(search.trim());

    const filtered = this.requests().filter((request) => {
      if (status === 'ativas' && !ACTIVE_STATUSES.includes(request.status)) return false;
      if (status !== 'ativas' && status !== 'todas' && request.status !== status) return false;
      if (modality && request.modality !== modality) return false;
      if (category && !request.professionals.some((professional) => professional.category === category)) return false;
      return !term || normalize(this.searchableText(request)).includes(term);
    });

    return filtered.sort((a, b) => {
      if (sort === 'prazo') return a.desiredDeadline.localeCompare(b.desiredDeadline);
      if (sort === 'antigas') return a.createdAt.localeCompare(b.createdAt);
      return b.createdAt.localeCompare(a.createdAt);
    });
  });

  protected readonly hasActiveFilters = computed(() => {
    const values = this.filterValues();
    return (Object.keys(DEFAULT_FILTERS) as (keyof typeof DEFAULT_FILTERS)[]).some(
      (key) => values[key] !== DEFAULT_FILTERS[key],
    );
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');

    this.requestService.list().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.viewState.set(requests.length === 0 ? 'empty' : 'filled');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected clearFilters(): void {
    this.filters.reset({ ...DEFAULT_FILTERS });
  }

  protected proposalCount(request: ServiceRequest): number {
    return this.proposalCountByRequest().get(request.id) ?? 0;
  }

  protected canEdit(request: ServiceRequest): boolean {
    return this.requestService.canEdit(request);
  }

  protected canCancel(request: ServiceRequest): boolean {
    return this.requestService.canCancel(request);
  }

  protected askToCancel(request: ServiceRequest): void {
    this.requestToCancel.set(request);
  }

  protected closeCancelModal(): void {
    if (!this.isCancelling()) {
      this.requestToCancel.set(null);
    }
  }

  protected confirmCancel(): void {
    const request = this.requestToCancel();

    if (!request) {
      return;
    }

    this.isCancelling.set(true);

    this.requestService.cancel(request.id).subscribe({
      next: (updated) => {
        this.requests.update((requests) => requests.map((item) => (item.id === updated.id ? updated : item)));
        this.isCancelling.set(false);
        this.requestToCancel.set(null);
        this.toastService.info('Solicitação cancelada.');
      },
      error: (error: Error) => {
        this.isCancelling.set(false);
        this.toastService.error(error.message);
      },
    });
  }

  private searchableText(request: ServiceRequest): string {
    return [
      request.id,
      request.description,
      ...request.professionals.map((professional) => `${professional.categoryLabel} ${requestedSpecialtyNames(professional)}`),
      request.address ? `${request.address.neighborhood} ${request.address.city}` : '',
    ].join(' ');
  }
}
