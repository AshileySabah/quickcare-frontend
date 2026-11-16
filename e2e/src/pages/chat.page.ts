import { expect, Locator, Page } from '@playwright/test';

export class ChatPage {
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messageTexts: Locator;

  constructor(private readonly page: Page) {
    this.messageInput = page.locator('textarea.chat__input');
    this.sendButton = page.locator('button.chat__send');
    this.messageTexts = page.locator('.chat__text');
  }

  async openAsProfessionalAndGetChannel(requestId: string): Promise<string> {
    await this.page.goto(`/professional/mensagens/${requestId}`);
    await expect(this.page).toHaveURL(new RegExp(`/professional/mensagens/${requestId}/[^/]+`), {
      timeout: 25_000,
    });
    await expect(this.messageInput).toBeVisible({ timeout: 25_000 });

    const match = this.page.url().match(new RegExp(`/professional/mensagens/${requestId}/([^/?#]+)`));
    if (!match) {
      throw new Error(`Canal do chat não identificado na URL: ${this.page.url()}`);
    }
    return match[1];
  }

  async openAsPatientOnChannel(requestId: string, channel: string): Promise<void> {
    await this.page.goto(`/patient/mensagens/${requestId}/${channel}`);
    await expect(this.messageInput).toBeVisible({ timeout: 25_000 });
  }

  async sendMessage(text: string): Promise<void> {
    await expect(this.messageInput).toBeVisible();
    await this.messageInput.fill(text);
    await expect(this.sendButton).toBeEnabled();
    await this.sendButton.click();
    await expect(this.messageTexts.filter({ hasText: text })).toBeVisible({ timeout: 20_000 });
  }

  async expectMessageReceived(text: string): Promise<void> {
    await expect(this.messageTexts.filter({ hasText: text })).toBeVisible({ timeout: 25_000 });
  }
}
