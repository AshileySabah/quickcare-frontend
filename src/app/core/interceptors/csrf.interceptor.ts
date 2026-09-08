import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { getCookie } from './cookie.util';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const httpClient = inject(HttpClient);
  const outgoingReq = req.clone({ withCredentials: true });

  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next(outgoingReq);
  }

  const existingToken = getCookie(CSRF_COOKIE_NAME);

  if (existingToken) {
    return next(outgoingReq.clone({ setHeaders: { [CSRF_HEADER_NAME]: existingToken } }));
  }

  return httpClient.get(`${environment.apiUrl}/actuator/health`, { withCredentials: true }).pipe(
    switchMap(() =>
      next(outgoingReq.clone({ setHeaders: { [CSRF_HEADER_NAME]: getCookie(CSRF_COOKIE_NAME) ?? '' } })),
    ),
  );
};
