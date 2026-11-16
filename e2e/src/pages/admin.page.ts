import { Locator, Page } from '@playwright/test';

export class AdminPage {
  readonly validationHeading: Locator;
  readonly accessDeniedHeading: Locator;

  constructor(private readonly page: Page) {
    this.validationHeading = page.getByRole('heading', { level: 1, name: /Validação cadastral/i });
    this.accessDeniedHeading = page.getByRole('heading', { level: 1, name: 'Acesso negado' });
  }

  async gotoValidation(): Promise<void> {
    await this.page.goto('/admin/validacao');
  }
}
