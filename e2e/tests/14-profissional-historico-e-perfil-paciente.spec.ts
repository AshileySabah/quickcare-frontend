import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '14-profissional-historico-e-perfil-paciente';

test.describe('14 - Profissional: Histórico e Visualização do Perfil do Paciente @auth', () => {
  test('CT-E2E-14.1: deve carregar o Histórico de propostas encerradas em /professional/historico e aplicar filtros', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('professional'), 'Credenciais de profissional não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Autenticar Profissional e acessar /professional/historico', async () => {
      await login.goto();
      await login.login(envConfig.accounts.professional.email, envConfig.accounts.professional.password);
      await expect(page).toHaveURL(/\/professional/);

      await page.goto('/professional/historico');
      await expect(page.getByRole('heading', { level: 1, name: 'Histórico' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-historico-propostas-profissional',
        'Aba Histórico do Profissional listando propostas recusadas, canceladas ou concluídas',
      );
    });

    await test.step('Filtrar histórico textual e restaurar listagem em Limpar filtros', async () => {
      const searchInput = page.locator('ui-list-filters ui-input[formcontrolname="search"] input');
      if (await searchInput.isVisible()) {
        await searchInput.fill('E2E');
        await expect(searchInput).toHaveValue('E2E');
        await page.waitForTimeout(300);

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct01-02-historico-profissional-filtrado',
          'Filtro textual aplicado ao histórico de propostas do Profissional',
        );

        await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
        await expect(searchInput).toHaveValue('');
      }
    });
  });

  test('CT-E2E-14.2: deve proteger /professional/pacientes/:id sem vínculo e abrir o perfil de paciente com proposta aceita', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('professional'), 'Credenciais de profissional não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Validar bloqueio de sigilo ao tentar acessar ID de paciente sem aceite (/professional/pacientes/999999999)', async () => {
      await login.goto();
      await login.login(envConfig.accounts.professional.email, envConfig.accounts.professional.password);
      await expect(page).toHaveURL(/\/professional/);

      await page.goto('/professional/pacientes/999999999');
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.getByText('Perfil não disponível')).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-sigilo-perfil-paciente-sem-aceite',
        'Proteção de privacidade impedindo acesso a perfil de paciente sem proposta aceita',
      );
    });

    await test.step('Localizar paciente com histórico de aceite e abrir seu perfil em /professional/pacientes/:id', async () => {
      await page.goto('/professional/historico');
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      const personTrigger = page.locator('app-person-menu button.person-menu__trigger').first();
      if (await personTrigger.isVisible()) {
        await personTrigger.click();
        await page.getByRole('menuitem', { name: 'Ver perfil' }).click();
        await expect(page).toHaveURL(/\/professional\/pacientes\/\d+$/);
        await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
        await expect(page.locator('h1.profile-card__name')).toBeVisible();

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct02-02-perfil-paciente-liberado-ao-profissional',
          'Perfil do Paciente exibido ao Profissional com política de visibilidade de dados clínicos',
        );
      }
    });
  });
});
