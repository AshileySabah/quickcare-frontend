import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

/** Paciente só cria solicitação com o cadastro aprovado; antes disso, vê o andamento da validação. */
export const patientStatusGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(
    map((user) => {
      if (user?.role === 'patient' && user.validationStatus !== 'aprovado') {
        return router.parseUrl('/patient/validacao');
      }
      return true;
    }),
  );
};
