import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfessionalCategory, ProfessionalCategoryInfo, Specialty } from '../models';
import { PROFESSIONAL_CATEGORIES_MOCK, SPECIALTIES_MOCK } from '../../mocks';

interface EspecialidadeApiResponse {
  id: number;
  nome: string;
  categoria: ProfessionalCategory;
}

interface CategoriaProfissionalApiResponse {
  valor: ProfessionalCategory;
  rotulo: string;
  siglaRegistro: string | null;
}

@Injectable({ providedIn: 'root' })
export class SpecialtyService {
  private readonly http = inject(HttpClient);

  list(): Observable<Specialty[]> {
    return this.http.get<EspecialidadeApiResponse[]>(`${environment.apiUrl}/especialidades`).pipe(
      map((response) => response.map((item) => ({ id: String(item.id), name: item.nome, category: item.categoria }))),
      catchError(() => of(SPECIALTIES_MOCK)),
    );
  }

  listCategories(): Observable<ProfessionalCategoryInfo[]> {
    return this.http.get<CategoriaProfissionalApiResponse[]>(`${environment.apiUrl}/especialidades/categorias`).pipe(
      map((response) =>
        response.map((item) => ({ value: item.valor, label: item.rotulo, registrationLabel: item.siglaRegistro })),
      ),
      catchError(() => of(PROFESSIONAL_CATEGORIES_MOCK)),
    );
  }
}
