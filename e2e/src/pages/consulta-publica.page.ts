import { Locator, Page } from '@playwright/test';

export class ConsultaPublicaPage {
  readonly heading: Locator;
  readonly filtersForm: Locator;
  readonly categorySelect: Locator;
  readonly modalitySelect: Locator;
  readonly cityInput: Locator;
  readonly clearFiltersButton: Locator;
  readonly listItems: Locator;
  readonly listLinks: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;

  readonly profileNameHeading: Locator;
  readonly profileSubtitle: Locator;
  readonly profileDetailsList: Locator;
  readonly profileRatingsSection: Locator;
  readonly profileCtaButton: Locator;
  readonly backLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1.public-list__title');
    this.filtersForm = page.locator('form.public-filters');
    this.categorySelect = page.locator('form.public-filters ui-select[formcontrolname="category"] select');
    this.modalitySelect = page.locator('form.public-filters ui-select[formcontrolname="modality"] select');
    this.cityInput = page.locator('form.public-filters ui-input[formcontrolname="city"] input');
    this.clearFiltersButton = page.getByRole('button', { name: 'Limpar filtros' });
    this.listItems = page.locator('.public-list__items ui-card');
    this.listLinks = page.locator('a.public-list__link');
    this.emptyState = page.locator('ui-empty-state');
    this.errorState = page.locator('ui-error-state');

    this.profileNameHeading = page.locator('h1.profile-card__name');
    this.profileSubtitle = page.locator('p.profile-card__subtitle');
    this.profileDetailsList = page.locator('dl.profile-card__details');
    this.profileRatingsSection = page.locator('.profile-card__ratings ui-rating-summary');
    this.profileCtaButton = page.locator('.profile-card__actions').getByRole('button', { name: 'Quero ser atendido' });
    this.backLink = page.locator('ui-back-link a, ui-back-link button').first();
  }

  async gotoProfessionals(): Promise<void> {
    await this.page.goto('/consulta/profissionais');
  }

  async gotoRequests(): Promise<void> {
    await this.page.goto('/consulta/solicitacoes');
  }

  async gotoProfessionalProfile(id: string | number): Promise<void> {
    await this.page.goto(`/consulta/profissionais/${id}`);
  }
}
