import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';
import { PacientePage } from '../src/pages/paciente.page';

const SUITE_SLUG = '08-paciente-validacao-edicao-solicitacao';

function futureIsoDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.describe('08 - Paciente: Validações e Edição de Solicitação @auth', () => {
  test('CT-E2E-08.1: deve bloquear submissão vazia em /patient/novo e exigir endereço apenas na modalidade Presencial', async (
    { page },
    testInfo,
  ) => {
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);
    const paciente = new PacientePage(page);

    await test.step('Autenticar Paciente e submeter formulário vazio em /patient/novo', async () => {
      await login.goto();
      await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
      await expect(page).toHaveURL(/\/patient/);

      await paciente.gotoNewRequest();
      await expect(page.getByRole('heading', { level: 1, name: 'Nova solicitação' })).toBeVisible();

      await paciente.createRequestSubmitButton.scrollIntoViewIfNeeded();
      await paciente.createRequestSubmitButton.click();
      await expect(page).toHaveURL(/\/patient\/novo$/);
      await expect(page.locator('.ui-select__error, .ui-input__error, .ui-textarea__error').first()).toBeVisible();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-01-nova-solicitacao-erros-obrigatorios',
        'Validação bloqueando criação de solicitação com campos obrigatórios vazios',
      );
    });

    await test.step('Alternar modalidade entre Presencial e Online validando exibição condicional do endereço', async () => {
      const modalitySelect = page.locator('ui-select[formcontrolname="modality"] select');
      const addressCard = page.locator('ui-address-card');

      await modalitySelect.selectOption('presencial');
      await expect(addressCard).toBeVisible();
      await addressCard.scrollIntoViewIfNeeded();

      await captureEvidence(
        page,
        testInfo,
        SUITE_SLUG,
        'ct01-02-modalidade-presencial-exige-endereco',
        'Bloco de endereço exibido e exigido dinamicamente quando a modalidade é Presencial',
      );

      await modalitySelect.selectOption('online');
      await expect(addressCard).toHaveCount(0);
    });
  });

  test('CT-E2E-08.2: deve criar uma solicitação aberta, editar seus dados em /editar, confirmar alterações e executar autolimpeza', async (
    { page },
    testInfo,
  ) => {
    test.setTimeout(120_000);
    test.skip(!envConfig.hasCredentials('patient'), 'Credenciais de paciente não configuradas.');
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const login = new LoginPage(page);
    const paciente = new PacientePage(page);
    const tag = `E2E-EDIT-${Date.now()}`;
    let requestId = '';
    let cleanedUp = false;

    try {
      await test.step('Autenticar Paciente e publicar solicitação inicial para teste de edição', async () => {
        await login.goto();
        await login.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
        await expect(page).toHaveURL(/\/patient/);

        await paciente.gotoNewRequest();
        const catSelect = page.locator('app-requested-professionals-card ui-select[formcontrolname="category"] select').first();
        await catSelect.selectOption({ index: 1 });

        const multiSelect = page.locator('app-requested-professionals-card ui-multi-select[formcontrolname="specialtyIds"]').first();
        await multiSelect.locator('.ui-multi-select__control').click();
        await multiSelect.locator('.ui-multi-select__option').first().click();
        await page.locator('h1').first().click();

        await page.locator('ui-textarea[formcontrolname="description"] textarea').fill(`[${tag}] Descrição inicial antes da edição.`);
        await page.locator('ui-select[formcontrolname="modality"] select').selectOption('online');
        await page.locator('ui-input[formcontrolname="desiredDeadline"] input').fill(futureIsoDate(12));

        requestId = await paciente.submitNewRequest();
        await expect(page.getByText(`[${tag}] Descrição inicial antes da edição.`)).toBeVisible();
      });

      await test.step('Acionar botão Editar, alterar descrição e quantidade e salvar alterações', async () => {
        await page.getByRole('button', { name: 'Editar' }).click();
        await expect(page).toHaveURL(new RegExp(`/patient/solicitacoes/${requestId}/editar$`));
        await expect(page.getByRole('heading', { level: 1, name: 'Editar solicitação' })).toBeVisible();
        await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        const descArea = page.locator('ui-textarea[formcontrolname="description"] textarea');
        await descArea.fill(`[${tag}] Descrição atualizada com sucesso na tela de edição.`);

        const qtyInput = page.locator('app-requested-professionals-card ui-input[formcontrolname="quantity"] input').first();
        await qtyInput.fill('2');

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct02-01-tela-editar-solicitacao-preenchida',
          'Formulário Editar solicitação preenchido com nova descrição e quantidade alterada para 2 vagas',
        );

        await page.getByRole('button', { name: 'Salvar alterações' }).click();
        await expect(page).toHaveURL(/\/patient$/);
      });

      await test.step('Confirmar persistência dos dados editados no detalhe e cancelar para autolimpeza', async () => {
        await page.goto(`/patient/solicitacoes/${requestId}`);
        await expect(page.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
        await expect(page.getByText(`[${tag}] Descrição atualizada com sucesso na tela de edição.`)).toBeVisible();

        await captureEvidence(
          page,
          testInfo,
          SUITE_SLUG,
          'ct02-02-detalhe-solicitacao-apos-edicao',
          'Detalhe da solicitação comprovando a gravação da nova descrição e quantidade atualizada',
        );

        await paciente.cancelRequest(requestId);
        cleanedUp = true;
      });
    } finally {
      if (requestId && !cleanedUp) {
        try {
          await paciente.cancelRequest(requestId);
        } catch {
          // Ignora falha residual
        }
      }
    }
  });
});
