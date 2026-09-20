import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Specialty } from '../models';
import { SPECIALTIES_MOCK } from '../../mocks';

interface EspecialidadeApiResponse {
  id: number;
  nome: string;
}

@Injectable({ providedIn: 'root' })
export class SpecialtyService {
  private readonly http = inject(HttpClient);

  list(): Observable<Specialty[]> {
    return this.http.get<EspecialidadeApiResponse[]>(`${environment.apiUrl}/especialidades`).pipe(
      map((response) => response.map((item) => ({ id: String(item.id), name: item.nome }))),
      catchError(() => of(SPECIALTIES_MOCK)),
    );
  }
}
