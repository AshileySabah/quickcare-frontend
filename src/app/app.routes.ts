import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { newProfileGuard } from './core/guards/new-profile.guard';
import { patientStatusGuard } from './core/guards/patient-status.guard';
import { professionalStatusGuard } from './core/guards/professional-status.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'esqueci-senha',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'redefinir-senha',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'cadastro',
    loadComponent: () =>
      import('./features/auth/register-select/register-select.component').then(
        (m) => m.RegisterSelectComponent,
      ),
  },
  {
    path: 'cadastro/paciente',
    loadComponent: () =>
      import('./features/patient/register/patient-register.component').then(
        (m) => m.PatientRegisterComponent,
      ),
  },
  {
    path: 'cadastro/profissional',
    loadComponent: () =>
      import('./features/professional/register/professional-register.component').then(
        (m) => m.ProfessionalRegisterComponent,
      ),
  },
  {
    path: 'criar-perfil/paciente',
    canActivate: [authGuard, newProfileGuard],
    data: { newProfileRole: 'patient' },
    loadComponent: () =>
      import('./features/patient/register/patient-register.component').then(
        (m) => m.PatientRegisterComponent,
      ),
  },
  {
    path: 'criar-perfil/profissional',
    canActivate: [authGuard, newProfileGuard],
    data: { newProfileRole: 'professional' },
    loadComponent: () =>
      import('./features/professional/register/professional-register.component').then(
        (m) => m.ProfessionalRegisterComponent,
      ),
  },
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./features/auth/access-denied/access-denied.component').then(
        (m) => m.AccessDeniedComponent,
      ),
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
          import('./features/professional/my-proposals/my-proposals.component').then(
            (m) => m.MyProposalsComponent,
          ),
      },
      {
        path: 'pacientes/:id',
        loadComponent: () =>
          import('./features/profile/patient-profile/patient-profile.component').then(
            (m) => m.PatientProfileComponent,
          ),
      },
      {
        path: 'historico',
        data: { view: 'history' },
        loadComponent: () =>
          import('./features/professional/my-proposals/my-proposals.component').then(
            (m) => m.MyProposalsComponent,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/professional/edit-profile/professional-edit-profile.component').then(
            (m) => m.ProfessionalEditProfileComponent,
          ),
      },
      {
        path: 'bloqueados',
        data: { role: 'professional' },
        loadComponent: () =>
          import('./features/user-blocks/blocked-users/blocked-users.component').then(
            (m) => m.BlockedUsersComponent,
          ),
      },
      {
        path: 'documentos',
        data: { role: 'professional' },
        loadComponent: () =>
          import('./features/validation/documents-page/documents-page.component').then(
            (m) => m.DocumentsPageComponent,
          ),
      },
      {
        path: 'propostas/:id/editar',
        loadComponent: () =>
          import('./features/professional/proposal-edit/proposal-edit.component').then(
            (m) => m.ProposalEditComponent,
          ),
      },
    ],
  },
  {
    path: 'patient',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['patient'] },
    loadComponent: () =>
      import('./features/patient/patient-shell/patient-shell.component').then(
        (m) => m.PatientShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/patient/dashboard/patient-dashboard.component').then(
            (m) => m.PatientDashboardComponent,
          ),
      },
      {
        path: 'novo',
        canActivate: [patientStatusGuard],
        loadComponent: () =>
          import('./features/patient/request-form/request-form.component').then(
            (m) => m.RequestFormComponent,
          ),
      },
      {
        path: 'solicitacoes/:id',
        loadComponent: () =>
          import('./features/patient/request-detail/request-detail.component').then(
            (m) => m.RequestDetailComponent,
          ),
      },
      {
        path: 'solicitacoes/:id/editar',
        loadComponent: () =>
          import('./features/patient/request-form/request-form.component').then(
            (m) => m.RequestFormComponent,
          ),
      },
      {
        path: 'profissionais/:id',
        loadComponent: () =>
          import('./features/profile/professional-profile/professional-profile.component').then(
            (m) => m.ProfessionalProfileComponent,
          ),
      },
      {
        path: 'historico',
        loadComponent: () =>
          import('./features/patient/history/patient-history.component').then(
            (m) => m.PatientHistoryComponent,
          ),
      },
      {
        path: 'bloqueados',
        data: { role: 'patient' },
        loadComponent: () =>
          import('./features/user-blocks/blocked-users/blocked-users.component').then(
            (m) => m.BlockedUsersComponent,
          ),
      },
      {
        path: 'documentos',
        data: { role: 'patient' },
        loadComponent: () =>
          import('./features/validation/documents-page/documents-page.component').then(
            (m) => m.DocumentsPageComponent,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/patient/edit-profile/patient-edit-profile.component').then(
            (m) => m.PatientEditProfileComponent,
          ),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'validacao' },
      {
        path: 'validacao',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      { path: 'profissionais', pathMatch: 'full', redirectTo: 'validacao' },
      { path: 'pacientes', pathMatch: 'full', redirectTo: 'validacao' },
      { path: 'perfis', pathMatch: 'full', redirectTo: 'ocorrencias' },
      { path: 'solicitacoes', pathMatch: 'full', redirectTo: 'gerais/solicitacoes' },
      {
        path: 'profissionais/:id',
        data: { profile: 'professional' },
        loadComponent: () =>
          import('./features/admin/validation-detail/admin-validation-detail.component').then(
            (m) => m.AdminValidationDetailComponent,
          ),
      },
      {
        path: 'pacientes/:id',
        data: { profile: 'patient' },
        loadComponent: () =>
          import('./features/admin/validation-detail/admin-validation-detail.component').then(
            (m) => m.AdminValidationDetailComponent,
          ),
      },
      {
        path: 'disputas',
        loadComponent: () =>
          import('./features/admin/disputes/admin-disputes.component').then((m) => m.AdminDisputesComponent),
      },
      {
        path: 'disputas/:id',
        loadComponent: () =>
          import('./features/admin/dispute-detail/admin-dispute-detail.component').then(
            (m) => m.AdminDisputeDetailComponent,
          ),
      },
      {
        path: 'denuncias',
        loadComponent: () =>
          import('./features/admin/reports/admin-reports.component').then((m) => m.AdminReportsComponent),
      },
      {
        path: 'denuncias/:id',
        loadComponent: () =>
          import('./features/admin/report-detail/admin-report-detail.component').then(
            (m) => m.AdminReportDetailComponent,
          ),
      },
      {
        path: 'ocorrencias',
        data: { mode: 'demand' },
        loadComponent: () =>
          import('./features/admin/profiles/admin-profiles.component').then((m) => m.AdminProfilesComponent),
      },
      {
        path: 'perfis/:perfil/:id',
        loadComponent: () =>
          import('./features/admin/profile-detail/admin-profile-detail.component').then(
            (m) => m.AdminProfileDetailComponent,
          ),
      },
      {
        path: 'gerais',
        loadComponent: () =>
          import('./features/admin/general/admin-general.component').then((m) => m.AdminGeneralComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
          {
            path: 'usuarios',
            data: { mode: 'all' },
            loadComponent: () =>
              import('./features/admin/profiles/admin-profiles.component').then((m) => m.AdminProfilesComponent),
          },
          {
            path: 'solicitacoes',
            loadComponent: () =>
              import('./features/admin/requests/admin-requests.component').then((m) => m.AdminRequestsComponent),
          },
          {
            path: 'propostas',
            loadComponent: () =>
              import('./features/admin/proposals/admin-proposals.component').then((m) => m.AdminProposalsComponent),
          },
          {
            path: 'bloqueios-entre-usuarios',
            loadComponent: () =>
              import('./features/admin/user-blocks/admin-user-blocks.component').then(
                (m) => m.AdminUserBlocksComponent,
              ),
          },
        ],
      },
      {
        path: 'solicitacoes/:id',
        loadComponent: () =>
          import('./features/admin/request-detail/admin-request-detail.component').then(
            (m) => m.AdminRequestDetailComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
