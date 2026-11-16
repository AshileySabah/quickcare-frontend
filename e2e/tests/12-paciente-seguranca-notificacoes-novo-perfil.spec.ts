import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '12-paciente-seguranca-notificacoes-novo-perfil';

test.describe('12 - Paciente: Segurança, Bloqueios, Notificações e 2º Perfil @auth', () => {
  test('CT-E2E-12.1: deve validar seções de Segurança (/patient/seguranca), troca de senha, bloqueados e modal de encerramento sem encerrar conta', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acessar /patient/seguranca e validar e-mail, validação de troca de senha e usuários bloqueados', async () => {
      await login.goto();
      await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
      await expect(page).toHaveURL(/\/patient/);

      await page.goto('/patient/seguranca');
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
        'ct01-01-seguranca-paciente-validacao-senha',
        'Tela Segurança do Paciente validando obrigatoriedade dos campos antes da troca de senha',
      );

      await expect(page.getByRole('heading', { level: 2, name: 'Usuários bloqueados' })).toBeVisible();
    });

    await test.step('Abrir diálogo de Encerrar conta para verificar avisos de segurança e fechar sem confirmar', async () => {
      const closeBtn = page.getByRole('button', { name: 'Encerrar' });
      await closeBtn.scrollIntoViewIfNeeded();
      await closeBtn.click();

      const dialog = page.locator('app-close-account-dialog');
      await expect(dialog.locator('form.close-account-dialog')).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-modal-encerrar-conta-protegido-por-senha',
        'Diálogo de encerramento exigindo senha atual e informando prazo de recuperação de 30 dias',
      );

      await page.keyboard.press('Escape');
      await expect(dialog.locator('form.close-account-dialog')).toBeHidden();
    });
  });

  test('CT-E2E-12.2: deve abrir o painel de Notificações no cabeçalho e carregar a tela de expansão para 2º perfil (/criar-perfil/profissional)', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);

    await test.step('Acionar o sino de notificações no cabeçalho do Paciente', async () => {
      await login.goto();
      await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
      await expect(page).toHaveURL(/\/patient/);
      await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

      await page.locator('button.notification-bell__trigger').click();
      const bellPanel = page.locator('section.notification-bell__panel');
      await expect(bellPanel).toBeVisible();
      await expect(bellPanel.getByRole('heading', { level: 2, name: 'Notificações' })).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-01-painel-notificacoes-paciente',
        'Painel suspenso de Notificações aberto a partir do sino no cabeçalho do Paciente',
      );

      await page.locator('h1').first().click();
    });

    await test.step('Verificar opção de criação de 2º perfil no menu da conta única (/criar-perfil/profissional)', async () => {
      await page.locator('button.user-menu__trigger[aria-label="Abrir menu da conta"]').click();
      const createSecondProfileItem = page.getByRole('menuitem', { name: /Quero atender como profissional/i });

      if (await createSecondProfileItem.isVisible()) {
        await createSecondProfileItem.click();
        await expect(page).toHaveURL(/\/criar-perfil\/profissional$/);
        await expect(page.getByRole('heading', { level: 1, name: /Criar perfil de profissional/i })).toBeVisible();

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct02-02-expansao-segundo-perfil-profissional',
          'Formulário /criar-perfil/profissional reaproveitando dados da conta do Paciente para tornar-se multiconta',
        );
      }
    });
  });
});
