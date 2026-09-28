import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const AUTH_PATH = `${environment.apiUrl}/auth/`;

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const authenticatedReq = req.clone({ withCredentials: true });

  if (req.url.startsWith(AUTH_PATH)) {
    return next(authenticatedReq);
  }

  const http = inject(HttpClient);

  // O access token expira em poucos minutos: em um 401, renova pelo refresh
  // token (cookie) e repete a requisição uma única vez.
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
