import { Locator, Page } from '@playwright/test';

export class RecuperacaoPage {
  readonly forgotHeading: Locator;
  readonly emailInput: Locator;
  readonly emailError: Locator;
  readonly sendLinkButton: Locator;
  readonly checkEmailHeading: Locator;
  readonly useAnotherEmailLink: Locator;

  readonly invalidResetHeading: Locator;
  readonly requestNewLinkButton: Locator;

  readonly invalidRecoverHeading: Locator;
  readonly goToLoginButton: Locator;

  constructor(private readonly page: Page) {
    this.forgotHeading = page.getByRole('heading', { level: 1, name: 'Recuperar senha' });
    this.emailInput = page.locator('ui-input[formcontrolname="email"] input');
    this.emailError = page.locator('ui-input[formcontrolname="email"] .ui-input__error');
    this.sendLinkButton = page.getByRole('button', { name: 'Enviar link' });
    this.checkEmailHeading = page.getByRole('heading', { level: 1, name: 'Verifique seu e-mail' });
    this.useAnotherEmailLink = page.getByRole('link', { name: 'Usar outro e-mail' });

    this.invalidResetHeading = page.getByRole('heading', { level: 1, name: 'Link inválido ou expirado' });
    this.requestNewLinkButton = page.getByRole('button', { name: 'Pedir novo link' });

    this.invalidRecoverHeading = page.getByRole('heading', {
      level: 1,
      name: 'Não foi possível recuperar pelo link',
    });
    this.goToLoginButton = page.getByRole('button', { name: 'Ir para o login' });
  }

  async gotoForgotPassword(): Promise<void> {
    await this.page.goto('/esqueci-senha');
  }

  async gotoResetPassword(token?: string): Promise<void> {
    await this.page.goto(token ? `/redefinir-senha?token=${token}` : '/redefinir-senha');
  }

  async gotoRecoverAccount(token?: string): Promise<void> {
    await this.page.goto(token ? `/recuperar-conta?token=${token}` : '/recuperar-conta');
  }
}
