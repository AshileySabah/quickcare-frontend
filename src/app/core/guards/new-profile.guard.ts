import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { homeRouteFor } from '../auth/home-route';
import { SwitchableRole } from '../models';

/** Criar perfil só vale para o perfil que a conta ainda não tem; o admin nunca cria. */
export const newProfileGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const role = route.data['newProfileRole'] as SwitchableRole;

  return authService.ensureSession().pipe(
    map((user) => {
      if (!user) {
        return router.parseUrl('/login');
      }

      if (user.role === 'admin') {
        return router.parseUrl('/acesso-negado');
      }

      if (authService.profiles().some((profile) => profile.role === role)) {
        return router.parseUrl(homeRouteFor(user));
      }

      return true;
    }),
  );
};
