import { Locator, Page } from '@playwright/test';

export class ProfissionalPage {
  readonly mainHeading: Locator;

  constructor(private readonly page: Page) {
    this.mainHeading = page.locator('h1').first();
  }

  async gotoHome(): Promise<void> {
    await this.page.goto('/professional');
  }
}
