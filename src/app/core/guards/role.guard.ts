import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../models';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as UserRole[] | undefined;
  const user = authService.currentUser();

  if (!user) {
    return router.parseUrl('/login');
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return router.parseUrl('/acesso-negado');
  }

  return true;
};
