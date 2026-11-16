import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '20-admin-consultas-gerais-auditoria';

test.describe('20 - Admin: Consultas Gerais de Auditoria @auth', () => {
  test('CT-E2E-20.1: deve listar Usuários em /admin/gerais/usuarios e inspecionar o detalhe disciplinar de um perfil', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /admin/gerais/usuarios e abrir ficha em /admin/perfis/:perfil/:id', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);
      await expect(page).toHaveURL(/\/admin\/validacao/);

      await page.goto('/admin/gerais/usuarios');
      await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('a.admin-profiles__card-link').first()).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-admin-gerais-usuarios',
        'Auditoria global de Usuários em /admin/gerais/usuarios listando pacientes e profissionais',
      );

      await page.locator('a.admin-profiles__card-link').first().click();
      await expect(page).toHaveURL(/\/admin\/perfis\/(patient|professional)\/\d+$/);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-admin-detalhe-perfil-usuario',
        'Detalhe administrativo do perfil com histórico disciplinar e controles de governança',
      );
    });
  });

  test('CT-E2E-20.2: deve auditar Solicitações em /admin/gerais/solicitacoes e abrir o detalhe administrativo da solicitação', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /admin/gerais/solicitacoes e abrir /admin/solicitacoes/:id', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);
      await expect(page).toHaveURL(/\/admin\/validacao/);

      await page.goto('/admin/gerais/solicitacoes');
      await expect(page.getByRole('heading', { level: 1, name: 'Solicitações' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('a.admin-requests__card-link').first()).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-admin-gerais-solicitacoes',
        'Listagem global de Solicitações em /admin/gerais/solicitacoes com busca e filtros por status',
      );

      await page.locator('a.admin-requests__card-link').first().click();
      await expect(page).toHaveURL(/\/admin\/solicitacoes\/\d+$/);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-admin-detalhe-solicitacao',
        'Visão administrativa detalhada de uma solicitação com propostas e atendimentos vinculados',
      );
    });
  });

  test('CT-E2E-20.3: deve auditar Propostas em /admin/gerais/propostas e Bloqueios entre usuários em /admin/gerais/bloqueios-entre-usuarios', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /admin/gerais/propostas e validar listagem e filtros de propostas', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);
      await expect(page).toHaveURL(/\/admin\/validacao/);

      await page.goto('/admin/gerais/propostas');
      await expect(page.getByRole('heading', { level: 1, name: 'Propostas' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-01-admin-gerais-propostas',
        'Auditoria global de Propostas em /admin/gerais/propostas',
      );
    });

    await test.step('Acessar /admin/gerais/bloqueios-entre-usuarios e verificar listagem e busca', async () => {
      await page.goto('/admin/gerais/bloqueios-entre-usuarios');
      await expect(page.getByRole('heading', { level: 1, name: 'Bloqueios entre usuários' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.getByRole('button', { name: 'Bloquear usuários' })).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-02-admin-gerais-bloqueios-entre-usuarios',
        'Auditoria global de Bloqueios entre usuários em /admin/gerais/bloqueios-entre-usuarios',
      );
    });
  });
});
