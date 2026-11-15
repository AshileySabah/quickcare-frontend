import { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly heroTitle: Locator;
  readonly ctaPatientButton: Locator;
  readonly ctaProfessionalButton: Locator;
  readonly publicProfessionalsLink: Locator;
  readonly publicRequestsLink: Locator;

  constructor(private readonly page: Page) {
    this.heroTitle = page.getByRole('heading', {
      level: 1,
      name: /Atendimento de saúde sob demanda/i,
    });
    this.ctaPatientButton = page.locator('.home__hero-actions').getByRole('button', { name: 'Quero ser atendido' });
    this.ctaProfessionalButton = page.locator('.home__hero-actions').getByRole('button', { name: 'Quero atender' });
    this.publicProfessionalsLink = page.locator('a[href="/consulta/profissionais"]').first();
    this.publicRequestsLink = page.locator('a[href="/consulta/solicitacoes"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }
}
