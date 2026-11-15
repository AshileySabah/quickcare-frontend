import { Locator, Page } from '@playwright/test';

export class ConsultaPublicaPage {
  readonly heading: Locator;
  readonly filtersForm: Locator;
  readonly categorySelect: Locator;
  readonly modalitySelect: Locator;
  readonly cityInput: Locator;
  readonly clearFiltersButton: Locator;
  readonly listItems: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1.public-list__title');
    this.filtersForm = page.locator('form.public-filters');
    this.categorySelect = page.locator('form.public-filters ui-select[formcontrolname="category"] select');
    this.modalitySelect = page.locator('form.public-filters ui-select[formcontrolname="modality"] select');
    this.cityInput = page.locator('form.public-filters ui-input[formcontrolname="city"] input');
    this.clearFiltersButton = page.getByRole('button', { name: 'Limpar filtros' });
    this.listItems = page.locator('.public-list__items ui-card');
    this.emptyState = page.locator('ui-empty-state');
    this.errorState = page.locator('ui-error-state');
  }

  async gotoProfessionals(): Promise<void> {
    await this.page.goto('/consulta/profissionais');
  }

  async gotoRequests(): Promise<void> {
    await this.page.goto('/consulta/solicitacoes');
  }
}
