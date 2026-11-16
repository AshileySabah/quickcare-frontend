import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '16-profissional-documentos-e-seguranca';

test.describe('16 - Profissional: Documentos Regulatórios e Segurança @auth', () => {
  test('CT-E2E-16.1: deve carregar Documentos (/professional/documentos) exibindo registro profissional e filtros de validação', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('professional'), 'Credenciais de profissional não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Autenticar Profissional, acessar /professional/documentos e alternar filtros de status', async () => {
      await login.goto();
      await login.login(envConfig.accounts.professional.email, envConfig.accounts.professional.password);
      await expect(page).toHaveURL(/\/professional/);

      await page.goto('/professional/documentos');
      await expect(page.getByRole('heading', { level: 1, name: 'Documentos' })).toBeVisible();
      await expect(page.getByText(/CNPJ e registro/i)).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('.my-validation__summary')).toBeVisible();
      await expect(page.locator('app-my-step-card').first()).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-documentos-regulatorios-profissional',
        'Página Documentos do Profissional com etapas de CPF, identidade e registro do conselho',
      );

      const chips = page.locator('ui-filter-chips');
      await chips.getByRole('button', { name: 'Aprovados' }).click();
      await page.waitForTimeout(250);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-documentos-profissional-filtro-aprovados',
        'Etapas documentais do Profissional filtradas pelo status Aprovados',
      );
    });
  });

  test('CT-E2E-16.2: deve carregar Segurança (/professional/seguranca) e validar proteção de troca de senha e lista de bloqueados', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('professional'), 'Credenciais de profissional não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /professional/seguranca e validar seções de e-mail, senha e usuários bloqueados', async () => {
      await login.goto();
      await login.login(envConfig.accounts.professional.email, envConfig.accounts.professional.password);
      await expect(page).toHaveURL(/\/professional/);

      await page.goto('/professional/seguranca');
      await expect(page.getByRole('heading', { level: 1, name: 'Segurança' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('app-email-change-card')).toBeVisible();

      const pwdCard = page.locator('app-password-change-card');
      await pwdCard.scrollIntoViewIfNeeded();
      await pwdCard.getByRole('button', { name: 'Salvar nova senha' }).click();
      await expect(pwdCard.locator('.ui-input__error').first()).toHaveText('Informe sua senha atual.');

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-seguranca-profissional-validacao-senha',
        'Validação obrigatória de senha atual em /professional/seguranca',
      );

      const blockedHeading = page.getByRole('heading', { level: 2, name: 'Usuários bloqueados' });
      await blockedHeading.scrollIntoViewIfNeeded();
      await expect(blockedHeading).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-seguranca-profissional-usuarios-bloqueados',
        'Seção de gestão de usuários bloqueados e encerramento de conta do Profissional',
      );
    });
  });
});
