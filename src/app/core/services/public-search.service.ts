import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import {
  AttendanceModality,
  ProfessionalPublicProfile,
  PublicModality,
  PublicProfessional,
  PublicRequest,
  PublicSearchFilters,
} from '../models';
import { AtuacaoApi, toPracticeArea } from './practice-area.service';
import { PublicProfileService } from './public-profile.service';
import { ResumoAvaliacoesApi, toRatingSummary } from './rating.service';

interface ProfissionalPublicoApi {
  id: number;
  nome: string;
  avatarUrl: string | null;
  atuacoes: AtuacaoApi[];
  modalidadeAtendimento: AttendanceModality;
  cidade: string;
  uf: string;
  atendimentosConcluidos: number;
  avaliacoes: ResumoAvaliacoesApi;
}

interface SolicitacaoPublicaApi {
  id: number;
  modalidade: 'PRESENCIAL' | 'ONLINE';
  cidade?: string;
  uf?: string;
  prazoDesejado: string;
  criadoEm: string;
  profissionais: { categoriaRotulo: string; especialidades: string[]; quantidade: number; vagasAbertas: number }[];
}

@Injectable({ providedIn: 'root' })
export class PublicSearchService {
  private readonly http = inject(HttpClient);
  private readonly publicProfileService = inject(PublicProfileService);
  private readonly baseUrl = `${environment.apiUrl}/publico`;

  professionals(filters: PublicSearchFilters): Observable<PublicProfessional[]> {
    let params = this.baseParams(filters);
    if (filters.minRating) {
      params = params.set('notaMinima', String(filters.minRating));
    }
    return this.http.get<ProfissionalPublicoApi[]>(`${this.baseUrl}/profissionais`, { params }).pipe(
      map((response) => response.map(toProfessional)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível buscar os profissionais.'))),
    );
  }

  professional(id: string): Observable<ProfessionalPublicProfile | undefined> {
    return this.http.get<unknown>(`${this.baseUrl}/profissionais/${id}`).pipe(
      map((response) => this.publicProfileService.mapProfessional(response)),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404
          ? of(undefined)
          : throwError(() => normalizeError(error, 'Não foi possível carregar o perfil.')),
      ),
    );
  }

  requests(filters: PublicSearchFilters): Observable<PublicRequest[]> {
    return this.http.get<SolicitacaoPublicaApi[]>(`${this.baseUrl}/solicitacoes`, { params: this.baseParams(filters) }).pipe(
      map((response) => response.map(toRequest)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível buscar as solicitações.'))),
    );
  }

  private baseParams(filters: PublicSearchFilters): HttpParams {
    let params = new HttpParams();
    if (filters.category) {
      params = params.set('categoria', filters.category);
    }
    if (filters.specialtyId) {
      params = params.set('especialidadeId', filters.specialtyId);
    }
    if (filters.city?.trim()) {
      params = params.set('cidade', filters.city.trim());
    }
    if (filters.state) {
      params = params.set('uf', filters.state);
    }
    if (filters.modality) {
      params = params.set('modalidade', filters.modality.toUpperCase());
    }
    return params;
  }
}

function toProfessional(api: ProfissionalPublicoApi): PublicProfessional {
  return {
    id: String(api.id),
    name: api.nome,
    avatarUrl: api.avatarUrl ?? undefined,
    practiceAreas: (api.atuacoes ?? []).map(toPracticeArea),
    attendanceModality: api.modalidadeAtendimento,
    city: api.cidade,
    state: api.uf,
    completedServices: api.atendimentosConcluidos,
    ratings: toRatingSummary(api.avaliacoes),
  };
}

function toRequest(api: SolicitacaoPublicaApi): PublicRequest {
  return {
    id: String(api.id),
    modality: api.modalidade.toLowerCase() as PublicModality,
    city: api.cidade,
    state: api.uf,
    desiredDeadline: api.prazoDesejado,
    createdAt: api.criadoEm,
    slots: api.profissionais.map((slot) => ({
      categoryLabel: slot.categoriaRotulo,
      specialties: slot.especialidades,
      quantity: slot.quantidade,
      openSlots: slot.vagasAbertas,
    })),
  };
}
