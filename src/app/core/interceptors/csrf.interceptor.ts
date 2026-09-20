import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  return next(req.clone({ withCredentials: true }));
};
