import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { AdminPage } from '../src/pages/admin.page';
import { LoginPage } from '../src/pages/login.page';
import { PacientePage } from '../src/pages/paciente.page';
import { ProfissionalPage } from '../src/pages/profissional.page';

const SUITE_SLUG = '04-autenticacao-guards-perfis';

test.describe('04 - Proteção de Rotas (Guards), Autenticação por Perfil e Multiconta', () => {
  test('CT-E2E-04.1: deve redirecionar visitante não autenticado para /login ao tentar acessar rotas protegidas @smoke', async (
    { page },
    testInfo,
  ) => {
    await test.step('Tentar acessar /patient, /professional e /admin/validacao sem sessão ativa', async () => {
      for (const protectedRoute of ['/patient', '/professional', '/admin/validacao']) {
        await page.goto(protectedRoute);
        await expect(page).toHaveURL(/\/login/);
      }

      await expect(page.getByRole('heading', { level: 1, name: 'Entrar no QuickCare' })).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-guard-redireciona-visitante-login',
        'Visitante não autenticado bloqueado pelo authGuard e redirecionado para /login',
      );
    });
  });

  test('CT-E2E-04.2: deve autenticar Paciente, bloquear acesso ao painel Admin (/acesso-negado) e realizar Logout @auth', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);
    const paciente = new PacientePage(page);
    const admin = new AdminPage(page);

    await test.step('Realizar login como Paciente e validar carregamento do painel /patient', async () => {
      await login.goto();
      await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);

      await expect(page).toHaveURL(/\/patient/);
      await expect(paciente.dashboardHeading).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-painel-paciente-logado',
        'Painel do Paciente carregado após autenticação JWT bem-sucedida',
      );
    });

    await test.step('Tentar acessar /admin/validacao com perfil Paciente e validar bloqueio RBAC (/acesso-negado)', async () => {
      await admin.gotoValidation();
      await expect(page).toHaveURL(/\/acesso-negado/);
      await expect(admin.accessDeniedHeading).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-paciente-bloqueado-em-admin-acesso-negado',
        'roleGuard bloqueando tentativa de acesso de Paciente à área administrativa (/acesso-negado)',
      );
    });

    await test.step('Retornar ao painel do Paciente e encerrar sessão pelo menu da conta (Logout)', async () => {
      await paciente.gotoDashboard();
      await expect(page).toHaveURL(/\/patient/);
      await paciente.logout();
      await expect(page).toHaveURL(/\/(login)?$/);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-03-sessao-encerrada-logout',
        'Sessão encerrada com sucesso após acionar Sair no menu do usuário',
      );
    });
  });

  test('CT-E2E-04.3: deve autenticar Profissional de saúde e carregar seu painel restrito @auth', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('professional'), 'Credenciais de profissional não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);
    const profissional = new ProfissionalPage(page);

    await test.step('Realizar login como Profissional e validar área restrita /professional', async () => {
      await login.goto();
      await login.login(envConfig.accounts.professional.email, envConfig.accounts.professional.password);

      await expect(page).toHaveURL(/\/professional/);
      await expect(profissional.mainHeading).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-painel-profissional-logado',
        'Ambiente restrito do Profissional de saúde carregado após autenticação',
      );
    });
  });

  test('CT-E2E-04.4: deve permitir alternância entre perfis Paciente e Profissional em conta multiconta @auth', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('dual'), 'Credenciais multiconta não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Autenticar conta multiconta e verificar presença do seletor de perfis no cabeçalho', async () => {
      await login.goto();
      await login.login(envConfig.accounts.dual.email, envConfig.accounts.dual.password);

      await expect(page).toHaveURL(/\/(patient|professional)/);
      const switcher = page.locator('div.profile-switcher[aria-label="Perfil em uso"]');
      await expect(switcher).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct04-01-multiconta-perfil-inicial',
        'Conta multiconta autenticada exibindo o seletor Perfil em uso (Paciente / Profissional) no cabeçalho',
      );
    });

    await test.step('Alternar entre os perfis pelo seletor e validar mudança de contexto e rota', async () => {
      const switcher = page.locator('div.profile-switcher[aria-label="Perfil em uso"]');
      const startedAsProfessional = page.url().includes('/professional');

      if (startedAsProfessional) {
        await switcher.getByRole('button', { name: 'Paciente' }).click();
        await expect(page).toHaveURL(/\/patient/);
        await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct04-02-multiconta-perfil-alternado',
          'Contexto alternado dinamicamente para o perfil Paciente sem necessidade de novo login',
        );

        await switcher.getByRole('button', { name: 'Profissional' }).click();
        await expect(page).toHaveURL(/\/professional/);
      } else {
        await switcher.getByRole('button', { name: 'Profissional' }).click();
        await expect(page).toHaveURL(/\/professional/);
        await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct04-02-multiconta-perfil-alternado',
          'Contexto alternado dinamicamente para o perfil Profissional sem necessidade de novo login',
        );

        await switcher.getByRole('button', { name: 'Paciente' }).click();
        await expect(page).toHaveURL(/\/patient/);
      }
    });
  });

  test('CT-E2E-04.5: deve autenticar Administrador e carregar a fila de Validação cadastral @auth', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);
    const admin = new AdminPage(page);

    await test.step('Realizar login como Administrador e validar painel /admin/validacao', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);

      await expect(page).toHaveURL(/\/admin\/validacao/);
      await expect(admin.validationHeading).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct05-painel-admin-validacao-cadastral',
        'Painel administrativo de Validação cadastral carregado com filtros por perfil e situação',
      );
    });
  });
});
