import { Locator, Page } from '@playwright/test';

export class PacientePage {
  readonly dashboardHeading: Locator;
  readonly userMenuTrigger: Locator;
  readonly logoutMenuItem: Locator;

  constructor(private readonly page: Page) {
    this.dashboardHeading = page.locator('h1').first();
    this.userMenuTrigger = page.locator('button.user-menu__trigger[aria-label="Abrir menu da conta"]');
    this.logoutMenuItem = page.getByRole('menuitem', { name: 'Sair' });
  }

  async gotoDashboard(): Promise<void> {
    await this.page.goto('/patient');
  }

  async logout(): Promise<void> {
    await this.userMenuTrigger.click();
    await this.logoutMenuItem.click();
  }
}
