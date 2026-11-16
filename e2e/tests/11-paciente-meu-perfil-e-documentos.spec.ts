import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '11-paciente-meu-perfil-e-documentos';

test.describe('11 - Paciente: Meu Perfil e Documentos Cadastrais @auth', () => {
  test('CT-E2E-11.1: deve carregar a tela Meu perfil (/patient/perfil) com dados pessoais, contatos, saúde e declarações travadas', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Autenticar Paciente e acessar /patient/perfil pelo menu da conta', async () => {
      await login.goto();
      await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
      await expect(page).toHaveURL(/\/patient/);

      await page.locator('button.user-menu__trigger[aria-label="Abrir menu da conta"]').click();
      await page.getByRole('menuitem', { name: 'Meu perfil' }).click();

      await expect(page).toHaveURL(/\/patient\/perfil$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Meu perfil' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      const nameInput = page.locator('ui-basic-info-card ui-input[formcontrolname="name"] input');
      await expect(nameInput).toBeVisible();
      expect(((await nameInput.inputValue()) ?? '').trim().length).toBeGreaterThan(0);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-meu-perfil-paciente-dados-basicos',
        'Tela Meu perfil do Paciente exibindo dados básicos preenchidos e aviso de campos protegidos',
      );
    });

    await test.step('Validar cartões de saúde, endereço e declarações LGPD bloqueadas contra edição indevida', async () => {
      await expect(page.locator('ui-emergency-contacts-card')).toBeVisible();
      await expect(page.locator('ui-health-info-card')).toBeVisible();
      await expect(page.locator('ui-address-card')).toBeVisible();

      const declarationsCard = page.locator('ui-declarations-card');
      await declarationsCard.scrollIntoViewIfNeeded();
      const lgpdCheckbox = declarationsCard.locator('ui-checkbox[formcontrolname="lgpdConsent"] input[type="checkbox"]');
      await expect(lgpdCheckbox).toBeDisabled();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-meu-perfil-paciente-saude-e-declaracoes',
        'Seções complementares do perfil do Paciente e declarações LGPD travadas após cadastro',
      );
    });
  });

  test('CT-E2E-11.2: deve carregar a página Documentos (/patient/documentos) e filtrar as etapas de validação cadastral', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /patient/documentos e verificar resumo cadastral e etapas validadas', async () => {
      await login.goto();
      await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
      await expect(page).toHaveURL(/\/patient/);

      await page.goto('/patient/documentos');
      await expect(page.getByRole('heading', { level: 1, name: 'Documentos' })).toBeVisible();
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
      await expect(page.locator('.my-validation__summary')).toBeVisible();
      await expect(page.locator('app-my-step-card').first()).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-documentos-validacao-paciente',
        'Página Documentos exibindo status consolidado da validação cadastral e etapas enviadas',
      );
    });

    await test.step('Alternar chips de filtro de status (Aprovados / Em análise / Todos)', async () => {
      const chips = page.locator('ui-filter-chips');
      await expect(chips).toBeVisible();

      await chips.getByRole('button', { name: 'Aprovados' }).click();
      await page.waitForTimeout(250);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-02-documentos-filtro-aprovados',
        'Filtro por status Aprovados ativo nas etapas documentais do Paciente',
      );

      await chips.getByRole('button', { name: 'Todos' }).click();
      await expect(page.locator('app-my-step-card').first()).toBeVisible();
    });
  });
});
