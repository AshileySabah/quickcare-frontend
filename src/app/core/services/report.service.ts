import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { ReportInput, SwitchableRole } from '../models';
import { PERFIL_API } from './occurrence.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);

  send(role: SwitchableRole, reportedId: string, input: ReportInput): Observable<void> {
    const dados = {
      perfil: PERFIL_API[role],
      denunciadoId: Number(reportedId),
      motivo: input.reason.toUpperCase(),
      descricao: input.description.trim(),
    };
    const formData = new FormData();
    formData.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }));
    if (input.attachment) {
      formData.append('anexo', input.attachment, input.attachment.name);
    }
    return this.http.post<unknown>(`${environment.apiUrl}/denuncias`, formData).pipe(
      map(() => undefined),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível enviar a denúncia.'))),
    );
  }
}
