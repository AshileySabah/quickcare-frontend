import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { ChatPage } from '../src/pages/chat.page';
import { LoginPage } from '../src/pages/login.page';
import { PacientePage } from '../src/pages/paciente.page';
import { DiscoveredProfessionalCapability, ProfissionalPage } from '../src/pages/profissional.page';

const SUITE_SLUG = '17-chat-central-e-recursos-avancados';

function futureIsoDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test.describe('17 - Central de Mensagens e Recursos Avançados do Chat @fluxo', () => {
  test('CT-E2E-17.1: deve validar busca lateral na Central de Mensagens, busca interna, painel de informações e exclusão de mensagem em tempo real', async (
    { browser },
    testInfo,
  ) => {
    test.setTimeout(180_000);
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
      const tag = `E2E-CHAT-${Date.now()}`;
      const serviceDate = futureIsoDate(8);
      const deadlineDate = futureIsoDate(15);

      const patientLogin = new LoginPage(patientPage);
      const professionalLogin = new LoginPage(professionalPage);
      const paciente = new PacientePage(patientPage);
      const profissional = new ProfissionalPage(professionalPage);
      const patientChat = new ChatPage(patientPage);
      const professionalChat = new ChatPage(professionalPage);

      let capability!: DiscoveredProfessionalCapability;

      await test.step('Estabelecer conversa ativa entre Paciente e Profissional', async () => {
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
          description: `[${tag}] Solicitação dedicada aos testes de recursos avançados do Chat.`,
          modality: capability.modality,
          desiredDeadline: deadlineDate,
          address: capability.address,
        });
        requestId = await paciente.submitNewRequest();

        await profissional.fillProposalForRequest(requestId, {
          price: '190',
          startDateTime: `${serviceDate}T09:00`,
          endDateTime: `${serviceDate}T10:00`,
          approach: `[${tag}] Proposta para habilitar sala de chat.`,
        });
        await profissional.submitFilledProposal();

        await paciente.openAcceptProposalModal(requestId);
        await paciente.confirmAcceptProposal();
      });

      await test.step('Validar Central de Mensagens (/patient/mensagens) e filtro lateral de conversas', async () => {
        await patientPage.goto('/patient/mensagens');
        await expect(patientPage.locator('h1.chat-shell__title')).toHaveText('Mensagens');
        const sideSearch = patientPage.locator('input[aria-label="Buscar por nome ou mensagem"]');
        await expect(sideSearch).toBeVisible();
        await sideSearch.fill(`#${requestId}`);
        await patientPage.waitForTimeout(300);

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct01-01-central-mensagens-busca-lateral',
          'Central de Mensagens filtrando conversas pela barra lateral de busca',
        );

        await sideSearch.fill('');
      });

      await test.step('Validar Busca nesta conversa e Painel de Informações da conversa', async () => {
        const channel = await professionalChat.openAsProfessionalAndGetChannel(requestId);
        await patientChat.openAsPatientOnChannel(requestId, channel);

        const msgText = `Mensagem para busca e exclusão (${tag})`;
        await patientChat.sendMessage(msgText);
        await professionalChat.expectMessageReceived(msgText);

        // Lupa Buscar nesta conversa
        await patientPage.locator('button[aria-label="Buscar nesta conversa"]').click();
        const innerSearch = patientPage.locator('input.chat__search-input');
        await expect(innerSearch).toBeVisible();
        await innerSearch.fill(tag);
        await expect(patientPage.locator('.chat__search-count')).toContainText('1');

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct01-02-chat-busca-interna-mensagens',
          'Recurso Buscar nesta conversa localizando ocorrências exatas dentro do histórico do canal',
        );

        await patientPage.locator('button.chat__search-close').click();

        // Painel de Informações da conversa
        await patientPage.locator('button[aria-label="Informações da conversa"]').click();
        await expect(patientPage.locator('app-chat-info-panel')).toBeVisible();

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct01-03-chat-painel-informacoes-conversa',
          'Painel lateral Informações da conversa exibindo participantes e dados da solicitação',
        );

        await patientPage.locator('button[aria-label="Informações da conversa"]').click();
      });

      await test.step('Apagar mensagem enviada pelo Paciente e validar atualização em tempo real no Profissional + autolimpeza', async () => {
        const myRow = patientPage.locator('.chat__row--mine').last();
        await myRow.locator('button[aria-label="Opções da mensagem"]').click();
        await patientPage.getByRole('menuitem', { name: 'Apagar mensagem' }).click();
        await patientPage.getByRole('button', { name: 'Sim, apagar' }).click();

        await expect(patientPage.getByText('Você apagou esta mensagem')).toBeVisible({ timeout: 20_000 });
        await expect(professionalPage.getByText('Mensagem apagada')).toBeVisible({ timeout: 20_000 });

        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct01-04-chat-mensagem-apagada-tempo-real',
          'Visão do Profissional atualizada instantaneamente via WebSocket exibindo Mensagem apagada',
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
