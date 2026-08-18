import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'cadastro',
    loadComponent: () =>
      import('./features/auth/register-select/register-select.component').then((m) => m.RegisterSelectComponent),
  },
  {
    path: 'cadastro/paciente',
    loadComponent: () =>
      import('./features/patient/register/patient-register.component').then((m) => m.PatientRegisterComponent),
  },
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./features/auth/access-denied/access-denied.component').then((m) => m.AccessDeniedComponent),
  },
  {
    path: 'patient',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['patient'] },
    loadComponent: () =>
      import('./features/patient/patient-shell/patient-shell.component').then((m) => m.PatientShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/patient/dashboard/patient-dashboard.component').then((m) => m.PatientDashboardComponent),
      },
      {
        path: 'novo',
        loadComponent: () =>
          import('./features/patient/request-form/request-form.component').then((m) => m.RequestFormComponent),
      },
      {
        path: 'solicitacoes/:id',
        loadComponent: () =>
          import('./features/patient/request-detail/request-detail.component').then((m) => m.RequestDetailComponent),
      },
      {
        path: 'solicitacoes/:id/editar',
        loadComponent: () =>
          import('./features/patient/request-form/request-form.component').then((m) => m.RequestFormComponent),
      },
      {
        path: 'historico',
        loadComponent: () =>
          import('./features/patient/history/patient-history.component').then((m) => m.PatientHistoryComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/patient/profile/patient-profile.component').then((m) => m.PatientProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
