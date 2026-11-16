import { expect, Locator, Page } from '@playwright/test';

export interface NewRequestInput {
  categoryValue: string;
  specialtyLabel: string;
  quantity?: string;
  description: string;
  modality: 'online' | 'presencial';
  desiredDeadline: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export class PacientePage {
  readonly dashboardHeading: Locator;
  readonly userMenuTrigger: Locator;
  readonly logoutMenuItem: Locator;
  readonly createRequestSubmitButton: Locator;
  readonly acceptProposalButton: Locator;
  readonly confirmAcceptButton: Locator;
  readonly chatButton: Locator;
  readonly cancelRequestButton: Locator;
  readonly confirmCancelRequestButton: Locator;

  constructor(private readonly page: Page) {
    this.dashboardHeading = page.locator('h1').first();
    this.userMenuTrigger = page.locator('button.user-menu__trigger[aria-label="Abrir menu da conta"]');
    this.logoutMenuItem = page.getByRole('menuitem', { name: 'Sair' });
    this.createRequestSubmitButton = page.getByRole('button', { name: 'Criar solicitação' });
    this.acceptProposalButton = page.getByRole('button', { name: /Aceitar proposta/i }).first();
    this.confirmAcceptButton = page.getByRole('button', { name: 'Sim, aceitar a proposta' });
    this.chatButton = page.getByRole('button', { name: 'Conversar' });
    this.cancelRequestButton = page.getByRole('button', { name: /Cancelar solicitação/i });
    this.confirmCancelRequestButton = page.getByRole('button', { name: 'Sim, cancelar a solicitação' });
  }

  async gotoDashboard(): Promise<void> {
    await this.page.goto('/patient');
  }

  async gotoNewRequest(): Promise<void> {
    await this.page.goto('/patient/novo');
    await expect(this.page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
  }

  async logout(): Promise<void> {
    await this.userMenuTrigger.click();
    await this.logoutMenuItem.click();
  }

  async fillNewRequestForm(input: NewRequestInput): Promise<void> {
    await this.gotoNewRequest();

    const categorySelect = this.page
      .locator('app-requested-professionals-card ui-select[formcontrolname="category"] select')
      .first();
    await categorySelect.selectOption(input.categoryValue);

    const multiSelect = this.page
      .locator('app-requested-professionals-card ui-multi-select[formcontrolname="specialtyIds"]')
      .first();
    await multiSelect.locator('.ui-multi-select__control').click();
    await multiSelect.locator('.ui-multi-select__option', { hasText: input.specialtyLabel }).first().click();
    await this.page.locator('h1').first().click();

    if (input.quantity) {
      const qtyInput = this.page
        .locator('app-requested-professionals-card ui-input[formcontrolname="quantity"] input')
        .first();
      await qtyInput.fill(input.quantity);
    }

    await this.page.locator('ui-textarea[formcontrolname="description"] textarea').fill(input.description);
    await this.page.locator('ui-select[formcontrolname="modality"] select').selectOption(input.modality);
    await this.page.locator('ui-input[formcontrolname="desiredDeadline"] input').fill(input.desiredDeadline);

    if (input.modality === 'presencial' && input.address) {
      await this.page.locator('ui-address-card ui-input[formcontrolname="cep"] input').fill(input.address.cep);
      await this.page.locator('ui-address-card ui-input[formcontrolname="street"] input').fill(input.address.street);
      await this.page.locator('ui-address-card ui-input[formcontrolname="number"] input').fill(input.address.number);
      await this.page
        .locator('ui-address-card ui-input[formcontrolname="neighborhood"] input')
        .fill(input.address.neighborhood);
      await this.page.locator('ui-address-card ui-input[formcontrolname="city"] input').fill(input.address.city);
      await this.page.locator('ui-address-card ui-select[formcontrolname="state"] select').selectOption(input.address.state);
    }
  }

  async submitNewRequest(): Promise<string> {
    const createResponsePromise = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/solicitacoes') && res.ok(),
    );

    await this.createRequestSubmitButton.scrollIntoViewIfNeeded();
    await this.createRequestSubmitButton.click();

    const response = await createResponsePromise;
    const body = (await response.json()) as { id?: number | string };
    const requestId = String(body.id ?? '');
    if (!requestId) {
      throw new Error('A API não retornou o ID da solicitação criada.');
    }

    await expect(this.page).toHaveURL(/\/patient(\/solicitacoes\/\d+)?$/);
    await this.page.goto(`/patient/solicitacoes/${requestId}`);
    await expect(this.page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

    return requestId;
  }

  async openAcceptProposalModal(requestId: string): Promise<void> {
    await this.page.goto(`/patient/solicitacoes/${requestId}`);
    await expect(this.page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
    await expect(this.acceptProposalButton).toBeVisible();
    await this.acceptProposalButton.scrollIntoViewIfNeeded();
    await this.acceptProposalButton.click();
    await expect(this.confirmAcceptButton).toBeVisible();
  }

  async confirmAcceptProposal(): Promise<void> {
    await this.confirmAcceptButton.click();
    await expect(this.chatButton).toBeVisible({ timeout: 20_000 });
  }

  async cancelRequest(requestId: string): Promise<void> {
    await this.page.goto(`/patient/solicitacoes/${requestId}`);
    await expect(this.page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
    await expect(this.cancelRequestButton).toBeVisible();
    await this.cancelRequestButton.click();
    await this.page.waitForTimeout(400);
    if (await this.confirmCancelRequestButton.isVisible()) {
      await this.confirmCancelRequestButton.click();
    }
    await expect(this.cancelRequestButton).toBeHidden({ timeout: 20_000 });
    await expect(this.page.locator('ui-skeleton-list')).toBeHidden({ timeout: 20_000 });
  }
}
