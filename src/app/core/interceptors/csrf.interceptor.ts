import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';

// The XSRF-TOKEN cookie is set on the backend's own domain, which JS running
// on the frontend's (different) origin cannot read via document.cookie.
// The backend also echoes the token in this endpoint's JSON body so it can be
// read cross-origin and sent back as a header instead.
let cachedToken$: Observable<string> | null = null;

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const httpClient = inject(HttpClient);
  const outgoingReq = req.clone({ withCredentials: true });

  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next(outgoingReq);
  }

  if (!cachedToken$) {
    cachedToken$ = httpClient
      .get<{ token: string }>(`${environment.apiUrl}/auth/csrf`, { withCredentials: true })
      .pipe(
        map((response) => response.token),
        shareReplay(1),
      );
  }

  return cachedToken$.pipe(
    switchMap((token) => next(outgoingReq.clone({ setHeaders: { [CSRF_HEADER_NAME]: token } }))),
  );
};
