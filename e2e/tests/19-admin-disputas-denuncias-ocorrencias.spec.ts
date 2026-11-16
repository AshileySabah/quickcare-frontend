import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '19-admin-disputas-denuncias-ocorrencias';

test.describe('19 - Admin: Mediação e Disciplina (Disputas, Denúncias e Ocorrências) @auth', () => {
  test('CT-E2E-19.1: deve carregar o painel de Disputas (/admin/disputas) e alternar os filtros de situação', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /admin/disputas e verificar filtros e estados da fila', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);
      await expect(page).toHaveURL(/\/admin\/validacao/);

      await page.goto('/admin/disputas');
      await expect(page.getByRole('heading', { level: 1, name: 'Disputas' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      const chips = page.locator('ui-filter-chips.admin-disputes__filters button');
      expect(await chips.count()).toBeGreaterThan(1);
      await chips.last().click();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-admin-painel-disputas',
        'Módulo administrativo de Disputas carregado com filtros por situação do relato',
      );
    });
  });

  test('CT-E2E-19.2: deve carregar o painel de Denúncias (/admin/denuncias) e alternar filtros de julgamento', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /admin/denuncias e interagir com filtros de situação', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);
      await expect(page).toHaveURL(/\/admin\/validacao/);

      await page.goto('/admin/denuncias');
      await expect(page.getByRole('heading', { level: 1, name: 'Denúncias' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      const chips = page.locator('ui-filter-chips.admin-reports__filters button');
      expect(await chips.count()).toBeGreaterThan(1);
      await chips.last().click();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-admin-painel-denuncias',
        'Módulo administrativo de Denúncias carregado com filtros de acompanhamento e histórico',
      );
    });
  });

  test('CT-E2E-19.3: deve carregar Ocorrências e bloqueios (/admin/ocorrencias) com busca e filtros de recursos', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /admin/ocorrencias e validar controles de busca e situação disciplinar', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);
      await expect(page).toHaveURL(/\/admin\/validacao/);

      await page.goto('/admin/ocorrencias');
      await expect(page.getByRole('heading', { level: 1, name: 'Ocorrências e bloqueios' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('.admin-profiles__filters input')).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-admin-ocorrencias-e-bloqueios',
        'Módulo disciplinar de Ocorrências e bloqueios com regra de 3 ocorrências em 90 dias',
      );
    });
  });
});
