import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { professionalStatusGuard } from './core/guards/professional-status.guard';
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
    path: 'cadastro/profissional',
    loadComponent: () =>
      import('./features/professional/register/professional-register.component').then(
        (m) => m.ProfessionalRegisterComponent,
      ),
  },
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./features/auth/access-denied/access-denied.component').then((m) => m.AccessDeniedComponent),
  },
  {
    path: 'professional/aguardando-validacao',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['professional'] },
    loadComponent: () =>
      import('./features/professional/awaiting-validation/awaiting-validation.component').then(
        (m) => m.AwaitingValidationComponent,
      ),
  },
  {
    path: 'professional',
    canActivate: [authGuard, roleGuard, professionalStatusGuard],
    data: { roles: ['professional'] },
    loadComponent: () =>
      import('./features/professional/professional-shell/professional-shell.component').then(
        (m) => m.ProfessionalShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/professional/home/professional-home.component').then(
            (m) => m.ProfessionalHomeComponent,
          ),
      },
      {
        path: 'solicitacoes/:id',
        loadComponent: () =>
          import('./features/professional/request-detail/professional-request-detail.component').then(
            (m) => m.ProfessionalRequestDetailComponent,
          ),
      },
      {
        path: 'propostas',
        loadComponent: () =>
          import('./features/professional/my-proposals/my-proposals.component').then((m) => m.MyProposalsComponent),
      },
      {
        path: 'propostas/:id/editar',
        loadComponent: () =>
          import('./features/professional/proposal-edit/proposal-edit.component').then(
            (m) => m.ProposalEditComponent,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/professional/profile/professional-profile.component').then(
            (m) => m.ProfessionalProfileComponent,
          ),
      },
    ],
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
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'profissionais/:id',
        loadComponent: () =>
          import('./features/admin/professional-detail/admin-professional-detail.component').then(
            (m) => m.AdminProfessionalDetailComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
