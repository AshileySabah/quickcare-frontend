import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '18-admin-fila-e-dossies-validacao';

test.describe('18 - Admin: Fila e Dossiês de Validação Cadastral @auth', () => {
  test('CT-E2E-18.1: deve filtrar cadastros de Profissionais por situação e abrir o dossiê completo em /admin/profissionais/:id', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Autenticar Administrador, filtrar Profissionais Aprovados e abrir primeiro dossiê', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);
      await expect(page).toHaveURL(/\/admin\/validacao/);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await page.locator('ui-filter-chips[label="Filtrar por situação"]').getByRole('button', { name: 'Aprovados' }).click();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('a.admin-dashboard__card-link').first()).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-admin-fila-profissionais-aprovados',
        'Fila de Validação cadastral filtrando Profissionais com situação Aprovados',
      );

      await page.locator('a.admin-dashboard__card-link').first().click();
      await expect(page).toHaveURL(/\/admin\/profissionais\/\d+$/);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('h1.validation-detail__name')).toBeVisible();
      await expect(page.locator('dl.validation-detail__meta')).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-admin-dossie-validacao-profissional',
        'Dossiê administrativo de Profissional exibindo metadados, atuações e histórico de documentos',
      );
    });
  });

  test('CT-E2E-18.2: deve alternar para a fila de Pacientes e inspecionar um dossiê em /admin/pacientes/:id', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('admin'), 'Credenciais de administrador não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Selecionar filtro Pacientes -> Todos e abrir dossiê /admin/pacientes/:id', async () => {
      await login.goto();
      await login.login(envConfig.accounts.admin.email, envConfig.accounts.admin.password);
      await expect(page).toHaveURL(/\/admin\/validacao/);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await page.locator('ui-filter-chips[label="Filtrar por perfil"]').getByRole('button', { name: 'Pacientes' }).click();
      await page.locator('ui-filter-chips[label="Filtrar por situação"]').getByRole('button', { name: 'Todos' }).click();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('a.admin-dashboard__card-link').first()).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-admin-fila-pacientes-todos',
        'Fila administrativa alternada para o perfil Pacientes listando todos os cadastros',
      );

      await page.locator('a.admin-dashboard__card-link').first().click();
      await expect(page).toHaveURL(/\/admin\/pacientes\/\d+$/);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('h1.validation-detail__name')).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-admin-dossie-validacao-paciente',
        'Dossiê administrativo de Paciente com etapas de CPF e documento de identidade',
      );
    });
  });
});
