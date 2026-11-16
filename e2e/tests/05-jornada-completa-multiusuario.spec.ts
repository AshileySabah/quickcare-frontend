import { expect, test } from '@playwright/test';
import { envConfig } from '../src/config/env';
import { backendUnavailableReason, isBackendReachable } from '../src/helpers/backend-health';
import { captureEvidence } from '../src/helpers/evidence';
import { ChatPage } from '../src/pages/chat.page';
import { LoginPage } from '../src/pages/login.page';
import { PacientePage } from '../src/pages/paciente.page';
import { DiscoveredProfessionalCapability, ProfissionalPage } from '../src/pages/profissional.page';

const SUITE_SLUG = '05-jornada-completa-multiusuario';

function futureIsoDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

test.describe('05 - Jornada Completa Multiusuário (Solicitação -> Proposta -> Aceite -> Chat WebSocket) @fluxo', () => {
  test('CT-E2E-05.1: deve conectar Paciente e Profissional em dois navegadores isolados da solicitação ao Chat em tempo real com autolimpeza', async (
    { browser },
    testInfo,
  ) => {
    test.setTimeout(180_000);
    test.skip(
      !envConfig.hasCredentials('patient') || !envConfig.hasCredentials('professional'),
      'Credenciais de paciente e profissional são necessárias para executar a jornada completa @fluxo.',
    );
    test.skip(!(await isBackendReachable()), backendUnavailableReason());

    const patientContext = await browser.newContext();
    const professionalContext = await browser.newContext();

    const patientPage = await patientContext.newPage();
    const professionalPage = await professionalContext.newPage();

    let requestId = '';
    let cleanedUp = false;

    try {
      const uniqueTag = `E2E-${Date.now()}`;
      const serviceDate = futureIsoDate(7);
      const deadlineDate = futureIsoDate(14);

      const patientLogin = new LoginPage(patientPage);
      const professionalLogin = new LoginPage(professionalPage);
      const paciente = new PacientePage(patientPage);
      const profissional = new ProfissionalPage(professionalPage);
      const patientChat = new ChatPage(patientPage);
      const professionalChat = new ChatPage(professionalPage);

      let capability!: DiscoveredProfessionalCapability;

      await test.step('Autenticar Profissional e identificar atuação e modalidade compatíveis', async () => {
        await professionalLogin.goto();
        await professionalLogin.login(
          envConfig.accounts.professional.email,
          envConfig.accounts.professional.password,
        );
        await expect(professionalPage).toHaveURL(/\/professional/);
        capability = await profissional.discoverApprovedCapability();
      });

      await test.step('Autenticar Paciente em contexto isolado e publicar nova solicitação compatível', async () => {
        await patientLogin.goto();
        await patientLogin.login(envConfig.accounts.patient.email, envConfig.accounts.patient.password);
        await expect(patientPage).toHaveURL(/\/patient/);
        await expect(patientPage.locator('ui-skeleton-list')).toBeHidden({ timeout: 25_000 });

        await paciente.fillNewRequestForm({
          categoryValue: capability.categoryValue,
          specialtyLabel: capability.specialtyLabel,
          quantity: '1',
          description: `[${uniqueTag}] Solicitação automatizada E2E para validação ponta a ponta da jornada de atendimento.`,
          modality: capability.modality,
          desiredDeadline: deadlineDate,
          address: capability.address,
        });

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct01-01-paciente-preenche-nova-solicitacao',
          'Formulário de nova solicitação preenchido pelo Paciente com categoria e especialidade compatíveis',
        );

        requestId = await paciente.submitNewRequest();
        expect(Number(requestId)).toBeGreaterThan(0);

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct01-02-solicitacao-criada-aguardando-proposta',
          `Solicitação #${requestId} recém-criada pelo Paciente aguardando propostas`,
        );
      });

      await test.step('Profissional visualiza a solicitação aberta e submete proposta de atendimento', async () => {
        await profissional.fillProposalForRequest(requestId, {
          price: '180',
          startDateTime: `${serviceDate}T09:00`,
          endDateTime: `${serviceDate}T10:00`,
          approach: `[${uniqueTag}] Proposta técnica enviada no teste E2E com horário agendado e plano de cuidado.`,
        });

        await professionalPage.locator('app-proposal-form').scrollIntoViewIfNeeded();
        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct02-01-profissional-preenche-proposta',
          'Formulário de proposta preenchido pelo Profissional com valor, período e abordagem',
        );

        await profissional.submitFilledProposal();

        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct02-02-proposta-enviada-pelo-profissional',
          'Proposta registrada pelo Profissional com status Pendente aguardando decisão do Paciente',
        );
      });

      await test.step('Paciente analisa a proposta recebida e confirma o aceite formal', async () => {
        await paciente.openAcceptProposalModal(requestId);

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct03-01-modal-confirmacao-aceite-proposta',
          'Diálogo de confirmação de aceite da proposta exibindo regras e consequências',
        );

        await paciente.confirmAcceptProposal();

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct03-02-proposta-aceita-botao-conversar-liberado',
          'Proposta aceita pelo Paciente liberando o botão Conversar para o Chat privado',
        );
      });

      await test.step('Paciente e Profissional trocam mensagens bidirecionais em tempo real via WebSocket', async () => {
        const channel = await professionalChat.openAsProfessionalAndGetChannel(requestId);
        await patientChat.openAsPatientOnChannel(requestId, channel);

        const msgFromPatient = `Olá! Solicitação #${requestId} (${uniqueTag}) confirmada pelo paciente.`;
        const msgFromProfessional = `Perfeito! Mensagem recebida em tempo real pelo profissional (${uniqueTag}).`;

        await patientChat.sendMessage(msgFromPatient);
        await professionalChat.expectMessageReceived(msgFromPatient);

        await professionalChat.sendMessage(msgFromProfessional);
        await patientChat.expectMessageReceived(msgFromProfessional);

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct04-01-chat-websocket-visao-paciente',
          'Visão do Paciente no Chat exibindo mensagem enviada e resposta recebida em tempo real via STOMP/WebSocket',
        );

        await captureEvidence(
          professionalPage,
          testInfo,
          SUITE_SLUG,
          'ct04-02-chat-websocket-visao-profissional',
          'Visão simultânea do Profissional no Chat comprovando sincronização bidirecional instantânea',
        );
      });

      await test.step('Autolimpeza: Paciente cancela a solicitação de teste para não poluir a base ativa', async () => {
        await paciente.cancelRequest(requestId);
        cleanedUp = true;

        await captureEvidence(
          patientPage,
          testInfo,
          SUITE_SLUG,
          'ct05-autolimpeza-solicitacao-cancelada',
          'Solicitação de teste cancelada automaticamente ao final da bateria preservando a higiene do ambiente',
        );
      });
    } finally {
      if (requestId && !cleanedUp) {
        try {
          const pacienteCleanup = new PacientePage(patientPage);
          await pacienteCleanup.cancelRequest(requestId);
        } catch {
          // Ignora falha na limpeza de emergência
        }
      }
      await patientContext.close();
      await professionalContext.close();
    }
  });
});
