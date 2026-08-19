import { HttpInterceptorFn } from '@angular/common/http';
import { getCookie } from './cookie.util';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  let outgoingReq = req.clone({ withCredentials: true });

  if (MUTATING_METHODS.has(req.method.toUpperCase())) {
    const csrfToken = getCookie('csrf_token');

    if (csrfToken) {
      outgoingReq = outgoingReq.clone({ setHeaders: { 'X-CSRF-Token': csrfToken } });
    }
  }

  return next(outgoingReq);
};
