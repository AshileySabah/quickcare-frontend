import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const AUTH_PATH = `${environment.apiUrl}/auth/`;
const AUTH_PATHS_WITH_REFRESH = [`${AUTH_PATH}perfil-ativo`];

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authenticatedReq = req.clone({ withCredentials: true });

  if (req.url.startsWith(AUTH_PATH) && !AUTH_PATHS_WITH_REFRESH.includes(req.url)) {
    return next(authenticatedReq);
  }

  const http = inject(HttpClient);

  return next(authenticatedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return http.post<void>(`${AUTH_PATH}refresh`, {}).pipe(
        catchError(() => throwError(() => error)),
        switchMap(() => next(authenticatedReq)),
      );
    }),
  );
};
