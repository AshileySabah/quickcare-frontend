import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '10-paciente-historico-e-busca-profissionais';

test.describe('10 - Paciente: Histórico e Busca Interna de Profissionais @auth', () => {
  test('CT-E2E-10.1: deve carregar o Histórico de solicitações encerradas em /patient/historico e permitir filtragem', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Autenticar Paciente e acessar a aba /patient/historico', async () => {
      await login.goto();
      await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
      await expect(page).toHaveURL(/\/patient/);

      await page.goto('/patient/historico');
      await expect(page.getByRole('heading', { level: 1, name: 'Histórico de solicitações' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-historico-solicitacoes-paciente',
        'Aba Histórico de solicitações exibindo solicitações concluídas ou canceladas do Paciente',
      );
    });

    await test.step('Aplicar busca textual no histórico e restaurar listagem em Limpar filtros', async () => {
      const searchInput = page.locator('ui-list-filters ui-input[formcontrolname="search"] input');
      if (await searchInput.isVisible()) {
        await searchInput.fill('E2E');
        await expect(searchInput).toHaveValue('E2E');
        await page.waitForTimeout(300);

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct01-02-historico-solicitacoes-filtrado',
          'Filtro textual aplicado sobre o histórico de solicitações encerradas',
        );

        await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
        await expect(searchInput).toHaveValue('');
      }
    });
  });

  test('CT-E2E-10.2: deve buscar profissionais logado em /patient/profissionais e abrir o perfil interno com ações de moderação', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /patient/profissionais como Paciente autenticado e selecionar um profissional', async () => {
      await login.goto();
      await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
      await expect(page).toHaveURL(/\/patient/);

      await page.goto('/patient/profissionais');
      await expect(page.getByRole('heading', { level: 1, name: 'Profissionais de saúde' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      const firstLink = page.locator('a.public-list__link').first();
      await expect(firstLink).toBeVisible();
      const profName = ((await firstLink.locator('.public-list__name').textContent()) ?? '').trim();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-busca-interna-profissionais-paciente',
        'Busca interna de profissionais validados acessível pelo menu Encontrar profissionais',
      );

      await firstLink.click();
      await expect(page).toHaveURL(/\/patient\/profissionais\/\d+$/);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('h1.profile-card__name')).toHaveText(profName);
      await expect(page.locator('app-profile-block-action')).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-perfil-profissional-visao-interna-paciente',
        'Perfil do profissional na visão interna do Paciente com detalhes, avaliações e controle de bloqueio',
      );
    });
  });
});
