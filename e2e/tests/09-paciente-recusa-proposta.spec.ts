import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { LoginPage } from '../src/pages/login.page';
import { PacientePage } from '../src/pages/paciente.page';
import { DiscoveredProfessionalCapability, ProfissionalPage } from '../src/pages/profissional.page';

const SUITE_SLUG = '09-paciente-recusa-proposta';

function futureIsoDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.describe('09 - Paciente: Recusa de Proposta Recebida @fluxo', () => {
  test('CT-E2E-09.1: deve permitir ao Paciente recusar uma proposta recebida no modal de confirmação, refletir na visão do Profissional e executar autolimpeza', async (
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
      const tag = `E2E-RECUSA-${Date.now()}`;
      const serviceDate = futureIsoDate(8);
      const deadlineDate = futureIsoDate(15);

      const patientLogin = new LoginPage(patientPage);
      const professionalLogin = new LoginPage(professionalPage);
      const paciente = new PacientePage(patientPage);
      const profissional = new ProfissionalPage(professionalPage);

      let capability!: DiscoveredProfessionalCapability;

      await test.step('Identificar especialidade liberada do Profissional e publicar solicitação pelo Paciente', async () => {
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
          description: `[${tag}] Solicitação criada para validação do fluxo de recusa de proposta.`,
          modality: capability.modality,
          desiredDeadline: deadlineDate,
          address: capability.address,
        });

        requestId = await paciente.submitNewRequest();
      });

      await test.step('Profissional envia proposta pendente para a solicitação', async () => {
        await profissional.fillProposalForRequest(requestId, {
          price: '210',
          startDateTime: `${serviceDate}T14:00`,
          endDateTime: `${serviceDate}T15:00`,
          approach: `[${tag}] Proposta de atendimento submetida para avaliação e recusa.`,
        });
        await profissional.submitFilledProposal();
      });

      await test.step('Paciente aciona Recusar, valida modal de confirmação e confirma a recusa', async () => {
        await patientPage.goto(`/patient/solicitacoes/${requestId}`);
        await expect(patientPage.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        const rejectButton = patientPage.getByRole('button', { name: /^Recusar$/i }).first();
        await expect(rejectButton).toBeVisible();
        await rejectButton.scrollIntoViewIfNeeded();
        await rejectButton.click();

        const confirmRejectButton = patientPage.getByRole('button', { name: 'Sim, recusar a proposta' });
        await expect(confirmRejectButton).toBeVisible();

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct01-01-modal-confirmacao-recusar-proposta',
          'Modal de confirmação exibido ao Paciente antes de recusar formalmente a proposta recebida',
        );

        await confirmRejectButton.click();
        await expect(rejectButton).toBeHidden({ timeout: 20_000 });
        await expect(patientPage.locator('ui-skeleton-list')).toBeHidden({ timeout: 20_000 });

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct01-02-proposta-recusada-visao-paciente',
          'Detalhe da solicitação após confirmação da recusa sem bloquear novas propostas para a vaga',
        );
      });

      await test.step('Profissional visualiza aviso de proposta recusada com opção de reenvio e Paciente faz autolimpeza', async () => {
        await professionalPage.goto(`/professional/solicitacoes/${requestId}`);
        await expect(professionalPage.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });
        await expect(professionalPage.getByText(/O paciente recusou a sua proposta anterior/i)).toBeVisible();

        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct01-03-aviso-recusa-reenvio-visao-profissional',
          'Visão do Profissional informando a recusa pelo Paciente e disponibilizando formulário de Reenviar proposta',
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
