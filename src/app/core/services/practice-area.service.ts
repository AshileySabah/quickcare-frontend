import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import {
  MyPracticeArea,
  PracticeArea,
  PracticeAreaImpact,
  PracticeAreaInput,
  ProfessionalCategory,
  ValidationStepStatus,
} from '../models';

export interface EspecialidadeApi {
  id: number;
  nome: string;
  categoria: ProfessionalCategory;
}

export interface AtuacaoApi {
  id: number;
  categoria: ProfessionalCategory;
  categoriaRotulo: string;
  rotulo: string;
  siglaRegistro: string | null;
  especialidades: EspecialidadeApi[];
  registroProfissional: string | null;
  registroProfissionalUf: string | null;
}

interface MinhaAtuacaoApi {
  atuacao: AtuacaoApi;
  statusRegistro: 'PENDENTE' | 'APROVADA' | 'REPROVADA' | null;
  liberada: boolean;
}

interface ImpactoApi {
  permitido: boolean;
  impedimento: string | null;
  propostas: {
    propostaId: number;
    solicitacaoId: number;
    servico: string;
    status: 'PENDENTE' | 'ACEITA';
    inicio: string;
    termino: string;
    geraOcorrencia: boolean;
  }[];
}

export function toPracticeArea(api: AtuacaoApi): PracticeArea {
  return {
    id: String(api.id),
    category: api.categoria,
    categoryLabel: api.categoriaRotulo,
    label: api.rotulo,
    registrationLabel: api.siglaRegistro,
    specialties: api.especialidades.map((especialidade) => ({
      id: String(especialidade.id),
      name: especialidade.nome,
      category: especialidade.categoria,
    })),
    registrationNumber: api.registroProfissional,
    registrationUf: api.registroProfissionalUf,
  };
}

export function toAtuacaoPayload(input: PracticeAreaInput) {
  return {
    categoria: input.category,
    especialidadeIds: input.specialtyIds.map(Number),
    registroProfissional: input.registrationNumber?.trim() || undefined,
    registroProfissionalUf: input.registrationUf || undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class PracticeAreaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/perfil/profissional/atuacoes`;

  list(): Observable<MyPracticeArea[]> {
    return this.http.get<MinhaAtuacaoApi[]>(this.baseUrl).pipe(
      map((response) => response.map(toMyPracticeArea)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar suas atuações.'))),
    );
  }

  include(input: PracticeAreaInput): Observable<MyPracticeArea[]> {
    const formData = new FormData();
    formData.append('dados', new Blob([JSON.stringify(toAtuacaoPayload(input))], { type: 'application/json' }));
    if (input.document) {
      formData.append('documento', input.document, input.document.name);
    }
    return this.http.post<MinhaAtuacaoApi[]>(this.baseUrl, formData).pipe(
      map((response) => response.map(toMyPracticeArea)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível incluir a atuação.'))),
    );
  }

  impact(id: string, specialtyIds?: string[]): Observable<PracticeAreaImpact> {
    const params = specialtyIds ? new HttpParams().set('especialidadeIds', specialtyIds.join(',')) : undefined;
    return this.http.get<ImpactoApi>(`${this.baseUrl}/${id}/impacto`, { params }).pipe(
      map(toImpact),
      catchError((error: unknown) =>
        throwError(() => normalizeError(error, 'Não foi possível conferir o que essa alteração afeta.')),
      ),
    );
  }

  updateSpecialties(id: string, specialtyIds: string[]): Observable<MyPracticeArea[]> {
    return this.http
      .put<MinhaAtuacaoApi[]>(`${this.baseUrl}/${id}/especialidades`, { especialidadeIds: specialtyIds.map(Number) })
      .pipe(
        map((response) => response.map(toMyPracticeArea)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível salvar as especialidades.'))),
      );
  }

  remove(id: string): Observable<MyPracticeArea[]> {
    return this.http.delete<MinhaAtuacaoApi[]>(`${this.baseUrl}/${id}`).pipe(
      map((response) => response.map(toMyPracticeArea)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível remover a atuação.'))),
    );
  }
}

function toMyPracticeArea(api: MinhaAtuacaoApi): MyPracticeArea {
  return {
    area: toPracticeArea(api.atuacao),
    registrationStatus: api.statusRegistro ? (api.statusRegistro.toLowerCase() as ValidationStepStatus) : null,
    released: api.liberada,
  };
}

function toImpact(api: ImpactoApi): PracticeAreaImpact {
  return {
    allowed: api.permitido,
    blocker: api.impedimento,
    proposals: api.propostas.map((proposta) => ({
      proposalId: String(proposta.propostaId),
      requestId: String(proposta.solicitacaoId),
      service: proposta.servico,
      status: proposta.status === 'ACEITA' ? 'aceita' : 'pendente',
      startsAt: proposta.inicio,
      endsAt: proposta.termino,
      createsOccurrence: proposta.geraOcorrencia,
    })),
  };
}
