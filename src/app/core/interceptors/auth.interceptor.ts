import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthTokenStore } from '../auth/auth-token.store';
import { SessionExpiredService } from '../auth/session-expired.service';

const AUTH_PATH = `${environment.apiUrl}/auth/`;
const AUTH_PATHS_WITH_RELOGIN = [`${AUTH_PATH}perfil-ativo`];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const tokens = inject(AuthTokenStore);
  const sessionExpired = inject(SessionExpiredService);

  const send = () => {
    const authorization = tokens.authorization();
    const request = authorization ? req.clone({ setHeaders: { Authorization: authorization } }) : req;
    return next(request).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          tokens.saveFrom(event.headers);
        }
      }),
    );
  };

  const canAskToLogIn =
    tokens.token() !== null && (!req.url.startsWith(AUTH_PATH) || AUTH_PATHS_WITH_RELOGIN.includes(req.url));
  if (!canAskToLogIn) {
    return send();
  }

  return send().pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return sessionExpired
        .askToLogIn()
        .pipe(switchMap((loggedIn) => (loggedIn ? send() : throwError(() => error))));
    }),
  );
};
