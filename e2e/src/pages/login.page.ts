import { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly emailError: Locator;
  readonly passwordInput: Locator;
  readonly passwordError: Locator;
  readonly togglePasswordButton: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly errorToast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Entrar no QuickCare' });
    this.emailInput = page.locator('ui-input[formcontrolname="email"] input');
    this.emailError = page.locator('ui-input[formcontrolname="email"] .ui-input__error');
    this.passwordInput = page.locator('ui-input[formcontrolname="password"] input');
    this.passwordError = page.locator('ui-input[formcontrolname="password"] .ui-input__error');
    this.togglePasswordButton = page.locator('ui-input[formcontrolname="password"] button.ui-input__reveal');
    this.submitButton = page.getByRole('button', { name: 'Entrar' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Esqueci minha senha' });
    this.registerLink = page.getByRole('link', { name: 'Cadastre-se' });
    this.errorToast = page.locator('.ui-toast--error .ui-toast__message');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
