import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';
import { PacientePage } from '../src/pages/paciente.page';
import { DiscoveredProfessionalCapability, ProfissionalPage } from '../src/pages/profissional.page';

const SUITE_SLUG = '13-profissional-gestao-propostas';

function futureIsoDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.describe('13 - Profissional: Gestão de Propostas (Validar, Enviar, Editar e Cancelar) @fluxo', () => {
  test('CT-E2E-13.1: deve validar campos obrigatórios da proposta, enviar, editar em /professional/propostas/:id/editar, cancelar proposta e fazer autolimpeza', async (
    { browser },
    testInfo,
  ) => {
    test.setTimeout(150_000);
    test.skip(
      !envConfig.hasCredentials('patient') || !envConfig.hasCredentials('professional'),
      'Credenciais de paciente e profissional necessárias.',
    );
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const patientContext = await browser.newContext();
    const professionalContext = await browser.newContext();
    const patientPage = await patientContext.newPage();
    const professionalPage = await professionalContext.newPage();

    let requestId = '';
    let cleanedUp = false;

    try {
      const tag = `E2E-PROP-${Date.now()}`;
      const serviceDate = futureIsoDate(9);
      const deadlineDate = futureIsoDate(16);

      const patientLogin = new LoginPage(patientPage);
      const professionalLogin = new LoginPage(professionalPage);
      const paciente = new PacientePage(patientPage);
      const profissional = new ProfissionalPage(professionalPage);

      let capability!: DiscoveredProfessionalCapability;

      await test.step('Autenticar Profissional e Paciente e publicar solicitação compatível', async () => {
        await professionalLogin.goto();
        await professionalLogin.login(
          envConfig.accounts.professional.email,
          envConfig.accounts.professional.password,
        );
        await expect(professionalPage).toHaveURL(/\/professional/);
        capability = await profissional.discoverApprovedCapability();

        await patientLogin.goto();
        await patientLogin.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
        await expect(patientPage).toHaveURL(/\/patient/);

        await paciente.fillNewRequestForm({
          categoryValue: capability.categoryValue,
          specialtyLabel: capability.specialtyLabel,
          quantity: '1',
          description: `[${tag}] Demanda para validação de envio, edição e cancelamento de proposta.`,
          modality: capability.modality,
          desiredDeadline: deadlineDate,
          address: capability.address,
        });
        requestId = await paciente.submitNewRequest();
      });

      await test.step('Validar bloqueio de proposta vazia e submeter proposta inicial em /professional/solicitacoes/:id', async () => {
        await professionalPage.goto(`/professional/solicitacoes/${requestId}`);
        await expect(professionalPage.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        await profissional.submitProposalButton.scrollIntoViewIfNeeded();
        await profissional.submitProposalButton.click();
        await expect(professionalPage.locator('app-proposal-form .ui-input__error').first()).toBeVisible();

        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct01-01-validacao-campos-obrigatorios-proposta',
          'Validação impedindo submissão de proposta sem preço, período e descrição da abordagem',
        );

        await profissional.fillProposalForRequest(requestId, {
          price: '200',
          startDateTime: `${serviceDate}T10:00`,
          endDateTime: `${serviceDate}T11:00`,
          approach: `[${tag}] Abordagem original antes da edição.`,
        });
        await profissional.submitFilledProposal();
      });

      await test.step('Acessar /professional/propostas, editar proposta em /editar e confirmar atualização', async () => {
        await professionalPage.goto('/professional/propostas');
        await expect(professionalPage.getByRole('heading', { level: 1, name: 'Minhas propostas' })).toBeVisible();
        await expect(professionalPage.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        const targetCard = professionalPage.locator('ui-proposal-card', { hasText: tag }).first();
        await expect(targetCard).toBeVisible();

        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct01-02-minhas-propostas-antes-edicao',
          'Aba Minhas propostas exibindo a proposta recém-enviada pelo Profissional',
        );

        await targetCard.getByRole('button', { name: 'Editar' }).click();
        await expect(professionalPage).toHaveURL(/\/professional\/propostas\/\d+\/editar$/);
        await expect(professionalPage.getByRole('heading', { level: 1, name: 'Editar proposta' })).toBeVisible();
        await expect(professionalPage.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        await professionalPage.locator('app-proposal-form ui-input[formcontrolname="price"] input').fill('245');
        await professionalPage
          .locator('app-proposal-form ui-textarea[formcontrolname="approach"] textarea')
          .fill(`[${tag}] Abordagem atualizada para R$ 245,00 na tela de edição.`);

        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct01-03-tela-editar-proposta-profissional',
          'Formulário Editar proposta preenchido com novo valor R$ 245,00 e descrição revisada',
        );

        await professionalPage.getByRole('button', { name: 'Salvar alterações' }).click();
        await expect(professionalPage).toHaveURL(/\/professional\/propostas$/);
        await expect(professionalPage.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        const updatedCard = professionalPage.locator('ui-proposal-card', {
          hasText: `[${tag}] Abordagem atualizada para R$ 245,00`,
        });
        await expect(updatedCard).toBeVisible();
      });

      await test.step('Cancelar proposta pendente pelo Profissional e executar autolimpeza da solicitação', async () => {
        const updatedCard = professionalPage.locator('ui-proposal-card', { hasText: tag }).first();
        await updatedCard.getByRole('button', { name: 'Cancelar' }).click();

        await expect(professionalPage.locator('ui-proposal-card', { hasText: tag })).toHaveCount(0, {
          timeout: 20_000,
        });

        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct01-04-proposta-cancelada-enviada-ao-historico',
          'Proposta pendente cancelada pelo Profissional e transferida automaticamente ao histórico',
        );

        await paciente.cancelRequest(requestId);
        cleanedUp = true;
      });
    } finally {
      if (requestId && !cleanedUp) {
        try {
          const pacienteCleanup = new PacientePage(patientPage);
          await pacienteCleanup.cancelRequest(requestId);
        } catch {
          // Ignora falha residual
        }
      }
      await patientContext.close();
      await professionalContext.close();
    }
  });
});
