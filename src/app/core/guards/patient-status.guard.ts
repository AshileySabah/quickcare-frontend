import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export const patientStatusGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(
    map((user) => {
      if (user?.role === 'patient' && user.validationStatus !== 'aprovado') {
        return router.parseUrl('/patient');
      }
      return true;
    }),
  );
};
