import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '15-profissional-meu-perfil-e-atuacoes';

test.describe('15 - Profissional: Meu Perfil e Áreas de Atuação @auth', () => {
  test('CT-E2E-15.1: deve carregar Meu perfil (/professional/perfil) com modalidade, endereço e seguro profissional', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('professional'), 'Credenciais de profissional não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Autenticar Profissional e acessar /professional/perfil', async () => {
      await login.goto();
      await login.login(envConfig.accounts.professional.email, envConfig.accounts.professional.password);
      await expect(page).toHaveURL(/\/professional/);

      await page.goto('/professional/perfil');
      await expect(page.getByRole('heading', { level: 1, name: 'Meu perfil' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      const nameInput = page.locator('ui-basic-info-card ui-input[formcontrolname="name"] input');
      await expect(nameInput).toBeVisible();
      expect(((await nameInput.inputValue()) ?? '').trim().length).toBeGreaterThan(0);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-meu-perfil-profissional-cabecalho',
        'Tela Meu perfil do Profissional com resumo de avaliações e informações básicas',
      );
    });

    await test.step('Validar cartões de forma de atendimento, endereço e declaração de seguro profissional', async () => {
      const practiceCard = page.locator('ui-professional-practice-card');
      await expect(practiceCard).toBeVisible();
      await practiceCard.scrollIntoViewIfNeeded();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-forma-atendimento-e-raio-profissional',
        'Configuração de modalidade de atendimento e raio geográfico em Meu perfil',
      );

      const declarationsCard = page.locator('ui-declarations-card');
      await declarationsCard.scrollIntoViewIfNeeded();
      await expect(page.getByText('Possuo seguro de responsabilidade civil profissional')).toBeVisible();
    });
  });

  test('CT-E2E-15.2: deve exibir o gerenciador de Atuação profissional e permitir abrir e cancelar inclusão sem sujar dados', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('professional'), 'Credenciais de profissional não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Inspecionar atuações cadastradas e testar abertura/cancelamento de Nova atuação', async () => {
      await login.goto();
      await login.login(envConfig.accounts.professional.email, envConfig.accounts.professional.password);
      await expect(page).toHaveURL(/\/professional/);

      await page.goto('/professional/perfil');
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      const manager = page.locator('app-practice-areas-manager');
      await expect(manager.getByRole('heading', { level: 2, name: 'Atuação profissional' })).toBeVisible();
      await expect(manager.locator('article.practice-areas-manager__item').first()).toBeVisible();
      await manager.scrollIntoViewIfNeeded();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-gerenciador-atuacoes-aprovadas',
        'Gerenciador de Atuação profissional listando categorias, especialidades e status do registro',
      );

      const includeBtn = manager.getByRole('button', { name: 'Incluir atuação' });
      if (await includeBtn.isVisible()) {
        await includeBtn.click();
        await expect(manager.getByRole('heading', { level: 3, name: 'Nova atuação' })).toBeVisible();

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct02-02-formulario-incluir-nova-atuacao',
          'Formulário de inclusão de nova área de atuação aberto no perfil do Profissional',
        );

        await manager.locator('.practice-areas-manager__include').getByRole('button', { name: 'Cancelar' }).click();
        await expect(manager.getByRole('heading', { level: 3, name: 'Nova atuação' })).toBeHidden();
      }
    });
  });
});
