import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const professionalStatusGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (!user || user.role !== 'professional') {
    return true;
  }

  if (user.validationStatus !== 'aprovado') {
    return router.parseUrl('/professional/aguardando-validacao');
  }

  return true;
};
