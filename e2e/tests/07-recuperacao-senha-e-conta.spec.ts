import { expect, test } from '@playwright/test';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { RecuperacaoPage } from '../src/pages/recuperacao.page';

const SUITE_SLUG = '07-recuperacao-senha-e-conta';

test.describe('07 - Recuperação de Senha e Recuperação de Conta @smoke', () => {
  test('CT-E2E-07.1: deve validar campo obrigatório, formato inválido de e-mail e resposta neutra anti-enumeração em /esqueci-senha', async (
    { page },
    testInfo,
  ) => {
    const recuperacao = new RecuperacaoPage(page);

    await test.step('Submeter formulário vazio e formato inválido em /esqueci-senha', async () => {
      await recuperacao.gotoForgotPassword();
      await expect(recuperacao.forgotHeading).toBeVisible();

      await recuperacao.sendLinkButton.click();
      await expect(recuperacao.emailError).toHaveText('Campo obrigatório.');

      await recuperacao.emailInput.fill('formato-invalido');
      await recuperacao.sendLinkButton.click();
      await expect(recuperacao.emailError).toHaveText('E-mail inválido.');

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-esqueci-senha-validacao-formato',
        'Validação impedindo envio com formato inválido de e-mail em /esqueci-senha',
      );
    });

    await test.step('Submeter e-mail sintaticamente válido e validar confirmação neutra (anti-enumeração)', async () => {
      if (!(await isBackendReachable())) {
        return;
      }

      await recuperacao.emailInput.fill('nao.cadastrado.e2e.recuperacao@quickcare.dev');
      await recuperacao.sendLinkButton.click();
      await expect(recuperacao.checkEmailHeading).toBeVisible({ timeout: 20_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-esqueci-senha-confirmacao-neutra',
        'Tela Verifique seu e-mail exibida sem revelar se o endereço existe na base',
      );

      await recuperacao.useAnotherEmailLink.click();
      await expect(recuperacao.forgotHeading).toBeVisible();
    });
  });

  test('CT-E2E-07.2: deve bloquear acesso direto ou com token inválido em /redefinir-senha oferecendo novo pedido', async (
    { page },
    testInfo,
  ) => {
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const recuperacao = new RecuperacaoPage(page);

    await test.step('Acessar /redefinir-senha sem token válido e validar mensagem Link inválido ou expirado', async () => {
      await recuperacao.gotoResetPassword('token-invalido-e2e-000');
      await expect(recuperacao.invalidResetHeading).toBeVisible({ timeout: 20_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-redefinir-senha-token-invalido',
        'Bloqueio seguro de redefinição de senha quando o token é ausente ou inválido',
      );

      await recuperacao.requestNewLinkButton.click();
      await expect(page).toHaveURL(/\/esqueci-senha$/);
    });
  });

  test('CT-E2E-07.3: deve bloquear link inválido em /recuperar-conta e direcionar de volta para o login', async (
    { page },
    testInfo,
  ) => {
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const recuperacao = new RecuperacaoPage(page);

    await test.step('Acessar /recuperar-conta sem token válido e acionar Ir para o login', async () => {
      await recuperacao.gotoRecoverAccount('token-invalido-recuperacao-000');
      await expect(recuperacao.invalidRecoverHeading).toBeVisible({ timeout: 20_000 });

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-recuperar-conta-link-invalido',
        'Tratamento seguro de token inválido em /recuperar-conta com orientação ao usuário',
      );

      await recuperacao.goToLoginButton.click();
      await expect(page).toHaveURL(/\/login$/);
    });
  });
});
