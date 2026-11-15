import { expect, test } from '@playwright/test';
import { isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';

const SUITE_SLUG = '02-login-validacoes';

test.describe('02 - Tela de Login e Validações de Formulário @smoke', () => {
  test('CT-E2E-02.1: deve exibir erros obrigatórios ao submeter o formulário completamente vazio', async (
    { page },
    testInfo,
  ) => {
    const login = new LoginPage(page);

    await test.step('Acessar /login e acionar "Entrar" sem preencher campos', async () => {
      await login.goto();
      await expect(login.heading).toBeVisible();
      await login.submitButton.click();

      await expect(login.emailError).toHaveText('Campo obrigatório.');
      await expect(login.passwordError).toHaveText('Campo obrigatório.');
      await expect(page).toHaveURL(/\/login$/);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-login-campos-vazios',
        'Mensagens de campo obrigatório exibidas para e-mail e senha ao submeter formulário vazio',
      );
    });
  });

  test('CT-E2E-02.2: deve exigir senha quando apenas o e-mail é preenchido', async ({ page }, testInfo) => {
    const login = new LoginPage(page);

    await test.step('Preencher e-mail válido, deixar senha em branco e submeter', async () => {
      await login.goto();
      await login.emailInput.fill('usuario@quickcare.dev');
      await login.submitButton.click();

      await expect(login.emailError).toHaveCount(0);
      await expect(login.passwordError).toHaveText('Campo obrigatório.');
      await expect(page).toHaveURL(/\/login$/);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct02-login-sem-senha',
        'Validação exigindo preenchimento da senha quando somente o e-mail é informado',
      );
    });
  });

  test('CT-E2E-02.3: deve exigir e-mail quando apenas a senha é preenchida', async ({ page }, testInfo) => {
    const login = new LoginPage(page);

    await test.step('Preencher senha, deixar e-mail em branco e submeter', async () => {
      await login.goto();
      await login.passwordInput.fill('Senha@123');
      await login.submitButton.click();

      await expect(login.emailError).toHaveText('Campo obrigatório.');
      await expect(login.passwordError).toHaveCount(0);
      await expect(page).toHaveURL(/\/login$/);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct03-login-sem-email',
        'Validação exigindo preenchimento do e-mail quando somente a senha é informada',
      );
    });
  });

  test('CT-E2E-02.4: deve validar formato inválido de e-mail e tamanho mínimo da senha', async (
    { page },
    testInfo,
  ) => {
    const login = new LoginPage(page);

    await test.step('Informar e-mail sem domínio e senha com menos de 6 caracteres', async () => {
      await login.goto();
      await login.emailInput.fill('email-sem-dominio');
      await login.passwordInput.fill('123');
      await login.submitButton.click();

      await expect(login.emailError).toHaveText('E-mail inválido.');
      await expect(login.passwordError).toHaveText('Senha deve ter ao menos 6 caracteres.');
      await expect(page).toHaveURL(/\/login$/);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct04-login-formato-email-e-senha-curta',
        'Validação simultânea de formato inválido de e-mail e comprimento mínimo da senha',
      );
    });
  });

  test('CT-E2E-02.5: deve alternar a visibilidade do campo de senha e navegar para links auxiliares', async (
    { page },
    testInfo,
  ) => {
    const login = new LoginPage(page);

    await test.step('Alternar botão Mostrar/Ocultar senha e verificar tipo do input', async () => {
      await login.goto();
      await login.passwordInput.fill('Segredo123');
      await expect(login.passwordInput).toHaveAttribute('type', 'password');

      await login.togglePasswordButton.click();
      await expect(login.passwordInput).toHaveAttribute('type', 'text');

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct05-01-login-senha-revelada',
        'Campo de senha com texto revelado após acionar o controle Mostrar senha',
      );

      await login.togglePasswordButton.click();
      await expect(login.passwordInput).toHaveAttribute('type', 'password');
    });

    await test.step('Navegar pelo link "Esqueci minha senha" para /esqueci-senha', async () => {
      await login.forgotPasswordLink.click();
      await expect(page).toHaveURL(/\/esqueci-senha$/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct05-02-link-esqueci-senha',
        'Tela de recuperação de senha acessada a partir do link auxiliar no login',
      );
    });

    await test.step('Retornar a /login e navegar pelo link "Cadastre-se" para /cadastro', async () => {
      await login.goto();
      await login.registerLink.click();
      await expect(page).toHaveURL(/\/cadastro$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Como você quer se cadastrar?' })).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct05-03-link-cadastre-se',
        'Tela de seleção de perfil de cadastro acessada pelo link Cadastre-se',
      );
    });
  });

  test('CT-E2E-02.6: deve rejeitar credenciais inexistentes com feedback visual de erro na API', async (
    { page },
    testInfo,
  ) => {
    const reachable = await isBackendReachable();
    test.skip(!reachable, 'API offline no momento — validação HTTP de credenciais requer backend ativo.');

    const login = new LoginPage(page);

    await test.step('Submeter conta não cadastrada e validar exibição do toast de erro', async () => {
      await login.goto();
      await login.login('inexistente.e2e.nao.cadastrado@quickcare.dev', 'SenhaIncorreta@999');

      await expect(login.errorToast).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      await page.waitForTimeout(250);

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct06-login-credenciais-invalidas-toast',
        'Toast de erro exibido após rejeição HTTP de credenciais inválidas pela API',
      );
    });
  });
});
