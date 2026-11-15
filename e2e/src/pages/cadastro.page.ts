import { Locator, Page } from '@playwright/test';

export class CadastroPage {
  readonly selectHeading: Locator;
  readonly patientOptionLink: Locator;
  readonly professionalOptionLink: Locator;

  readonly patientHeading: Locator;
  readonly professionalHeading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly cpfInput: Locator;
  readonly cpfError: Locator;
  readonly birthDateInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordError: Locator;
  readonly confirmPasswordInput: Locator;
  readonly confirmPasswordError: Locator;
  readonly documentsCard: Locator;
  readonly passwordCard: Locator;
  readonly declarationsCard: Locator;
  readonly declarationErrors: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.selectHeading = page.getByRole('heading', { level: 1, name: 'Como você quer se cadastrar?' });
    this.patientOptionLink = page.locator('a[href="/cadastro/paciente"]');
    this.professionalOptionLink = page.locator('a[href="/cadastro/profissional"]');

    this.patientHeading = page.getByRole('heading', { level: 1, name: 'Cadastro de paciente' });
    this.professionalHeading = page.getByRole('heading', { level: 1, name: /Cadastro de profissional/i });
    this.nameInput = page.locator('ui-input[formcontrolname="name"] input');
    this.emailInput = page.locator('ui-input[formcontrolname="email"] input');
    this.cpfInput = page.locator('ui-input[formcontrolname="cpf"] input');
    this.cpfError = page.locator('ui-input[formcontrolname="cpf"] .ui-input__error');
    this.birthDateInput = page.locator('ui-input[formcontrolname="birthDate"] input');
    this.passwordInput = page.locator('ui-password-fields ui-input').nth(0).locator('input');
    this.passwordError = page.locator('ui-password-fields ui-input').nth(0).locator('.ui-input__error');
    this.confirmPasswordInput = page.locator('ui-password-fields ui-input').nth(1).locator('input');
    this.confirmPasswordError = page.locator('ui-password-fields ui-input').nth(1).locator('.ui-input__error');
    this.documentsCard = page.locator('ui-documents-card');
    this.passwordCard = page.locator('ui-password-card');
    this.declarationsCard = page.locator('ui-declarations-card');
    this.declarationErrors = page.locator('.declarations-card__error');
    this.submitButton = page.getByRole('button', { name: 'Criar conta' });
  }

  async gotoSelect(): Promise<void> {
    await this.page.goto('/cadastro');
  }

  async gotoPatientRegister(): Promise<void> {
    await this.page.goto('/cadastro/paciente');
  }

  async gotoProfessionalRegister(): Promise<void> {
    await this.page.goto('/cadastro/profissional');
  }
}
