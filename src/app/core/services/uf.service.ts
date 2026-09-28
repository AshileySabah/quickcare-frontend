import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SelectOption } from '../../shared/ui/forms/select/select.component';

interface UfApiResponse {
  sigla: string;
  nome: string;
}

@Injectable({ providedIn: 'root' })
export class UfService {
  private readonly http = inject(HttpClient);

  list(): Observable<SelectOption[]> {
    return this.http.get<UfApiResponse[]>(`${environment.apiUrl}/ufs`).pipe(
      map((response) => response.map((item) => ({ value: item.sigla, label: `${item.sigla} - ${item.nome}` }))),
    );
  }
}
