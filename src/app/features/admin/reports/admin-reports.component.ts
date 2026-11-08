import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { createPagination } from '../../../core/lists/pagination';
import { ListViewState, REPORT_STATUS_LABELS, ReportStatus, ReportSummary } from '../../../core/models';
import { AdminReportService } from '../../../core/services/admin/admin-report.service';
import { BadgeComponent } from '../../../shared/ui/feedback/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/ui/feedback/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/ui/feedback/error-state/error-state.component';
import { SkeletonListComponent } from '../../../shared/ui/feedback/skeleton-list/skeleton-list.component';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';
import { CardComponent } from '../../../shared/ui/layout/card/card.component';
import { PaginatorComponent } from '../../../shared/ui/paginator/paginator.component';
import { REPORT_STATUS_VARIANTS } from './report-status';

type ReportFilter = 'pendentes' | 'aberta' | 'em_analise' | 'julgadas' | 'todas';

const FILTERS: FilterChip<ReportFilter>[] = [
  { value: 'pendentes', label: 'Para analisar' },
  { value: 'aberta', label: 'Abertas' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'julgadas', label: 'Julgadas' },
  { value: 'todas', label: 'Todas' },
];

const STATUS_BY_FILTER: Record<ReportFilter, ReportStatus[]> = {
  pendentes: ['aberta', 'em_analise'],
  aberta: ['aberta'],
  em_analise: ['em_analise'],
  julgadas: ['procedente', 'improcedente'],
  todas: [],
};

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    BadgeComponent,
    CardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FilterChipsComponent,
    PaginatorComponent,
    SkeletonListComponent,
  ],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.scss',
})
export class AdminReportsComponent {
  private readonly reportService = inject(AdminReportService);

  protected readonly filters = FILTERS;
  protected readonly selected = signal<ReportFilter>('pendentes');
  protected readonly viewState = signal<ListViewState>('loading');
  protected readonly reports = signal<ReportSummary[]>([]);
  protected readonly pager = createPagination(this.reports);
  protected readonly statusLabels = REPORT_STATUS_LABELS;
  protected readonly statusVariants = REPORT_STATUS_VARIANTS;

  constructor() {
    this.load();
  }

  protected select(filter: ReportFilter): void {
    this.selected.set(filter);
    this.load();
  }

  protected load(): void {
    this.viewState.set('loading');
    this.reportService.list(STATUS_BY_FILTER[this.selected()]).subscribe({
      next: (reports) => {
        this.reports.set(reports);
        this.viewState.set(reports.length ? 'filled' : 'empty');
      },
      error: () => this.viewState.set('error'),
    });
  }

  protected reporter(report: ReportSummary): string {
    return report.reporter === 'paciente'
      ? `${report.patient.name} (paciente) denunciou ${report.professional.name} (profissional)`
      : `${report.professional.name} (profissional) denunciou ${report.patient.name} (paciente)`;
  }
}
