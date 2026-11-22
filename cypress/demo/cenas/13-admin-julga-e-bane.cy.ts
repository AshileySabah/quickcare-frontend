import { api, route } from '../../support/api';
import { banimento, denunciaDetalhe, denunciaResumo, inDays, parte } from '../../support/factories';
import {
  CAMILA,
  DIEGO,
  MARIANA,
  RAFAEL,
  SOLICITACAO_ID,
  aceitaDe,
  avisoPara,
  propostaDe,
  sessaoAdminDemo,
  sessaoPacienteDemo,
  solicitacaoMariana,
  vagas,
} from '../support/elenco';
import { RITMO, entrar, legenda, notificacaoAoVivo, pausa, quem } from '../support/estudio';

const DESCRICAO =
  'A Camila me mandou mensagem dizendo que só vem amanhã se eu pagar R$ 300 por fora, fora do valor combinado na proposta.';
const JUSTIFICATIVA = 'O print confirma a cobrança fora da plataforma. Suspensão de 30 dias.';

describe('Cena 13 · Admin julga a denúncia e bane', () => {
  it('admin julga procedente com suspensão e Mariana é avisada', () => {
    const resumo = denunciaResumo({
      id: 600,
      motivo: 'COBRANCA_INDEVIDA',
      motivoRotulo: 'Cobrança indevida',
      denunciante: 'PACIENTE',
      paciente: parte(MARIANA),
      profissional: parte(CAMILA),
      pacienteId: MARIANA.usuarioId,
      profissionalId: CAMILA.usuarioId,
      criadoEm: inDays(0),
    });
    const detalhe = denunciaDetalhe({
      resumo,
      descricao: DESCRICAO,
      anexo: { nomeArquivo: 'print-da-conversa.png', contentType: 'image/png', url: 'https://arquivos.quickcare.dev/print-da-conversa.png' },
      atendimentos: [{ id: 502, solicitacaoId: SOLICITACAO_ID, servico: 'Cuidador(a) · Acompanhante de idosos', status: 'AGENDADO', inicio: inDays(3), termino: inDays(3) }],
    });
    const julgada = denunciaDetalhe({
      ...detalhe,
      resumo: { ...resumo, status: 'PROCEDENTE' },
      consequencia: 'BANIMENTO',
      justificativaDecisao: JUSTIFICATIVA,
      banimento: banimento({ id: 950, perfil: 'PROFISSIONAL', fim: inDays(30), justificativa: JUSTIFICATIVA, denunciaId: 600 }),
    });
    api('GET', '/admin/denuncias/em-aberto', { total: 1 });
    api('GET', '/admin/denuncias', [resumo]);
    api('GET', '/admin/denuncias/600', detalhe);
    api('POST', '/admin/denuncias/600/decisao', julgada);

    entrar('/admin/denuncias', sessaoAdminDemo());
    legenda('Cena 13 · Admin julga a denúncia e bane', 'Administrador');
    pausa();
    cy.contains('.admin-reports__card-link', 'Cobrança indevida').click();
    cy.contains(DESCRICAO).should('be.visible');
    pausa(RITMO.leitura);
    cy.contains('print-da-conversa.png').scrollIntoView();
    pausa(RITMO.leitura);

    cy.selectField('A denúncia é', 'procedente');
    cy.selectField('Consequência para quem foi denunciado', 'banimento');
    cy.selectField('Tipo de banimento', 'suspensao');
    cy.selectField('Duração', '30');
    pausa();
    cy.button('Registrar decisão').click();
    cy.dialog('Registrar decisão').within(() => {
      cy.contains('Julgar a denúncia como procedente?').should('be.visible');
      cy.fillField('Justificativa', JUSTIFICATIVA);
      pausa(600);
      cy.button('Sim, registrar a decisão').click();
    });
    cy.contains('Banimento aplicado').should('be.visible');
    pausa(RITMO.leitura);

    const avisoDenuncia = avisoPara('PACIENTE', 'DENUNCIA_PROCEDENTE', 'Denúncia procedente', 'A sua denúncia foi analisada e julgada procedente.', null);
    const avisoCancelamento = avisoPara(
      'PACIENTE',
      'ATENDIMENTO_CANCELADO',
      'Atendimento cancelado',
      `O atendimento com ${CAMILA.nome} foi cancelado e a vaga voltou a receber propostas.`,
      `/patient/solicitacoes/${SOLICITACAO_ID}`,
    );
    const avisos: object[] = [];
    cy.intercept(route('GET', '/notificacoes'), (req) => req.reply([...avisos].reverse()));
    cy.intercept(route('PATCH', /^\/notificacoes\/\d+\/lida$/), { ...avisoCancelamento, lida: true });
    const reaberta = solicitacaoMariana({ status: 'RECEBENDO_PROPOSTAS', totalPropostas: 3, profissionais: vagas(true, false) });
    api('GET', '/solicitacoes', [reaberta]);
    api('GET', `/solicitacoes/${SOLICITACAO_ID}`, reaberta);
    api('GET', `/solicitacoes/${SOLICITACAO_ID}/propostas`, [
      aceitaDe(RAFAEL, { status: 'FINALIZADO' }),
      propostaDe(CAMILA, {
        status: 'CANCELADA',
        atendimento: aceitaDe(CAMILA, { status: 'CANCELADO', canceladoPor: 'SISTEMA', motivoCancelamento: 'ADMIN' }).atendimento,
      }),
      propostaDe(DIEGO, { status: 'RECUSADA', profissional: { perfilIndisponivel: true, nome: null } }),
    ]);

    quem(`${MARIANA.nome}, paciente`);
    entrar('/patient', sessaoPacienteDemo());
    cy.then(() => avisos.push(avisoDenuncia));
    notificacaoAoVivo(avisoDenuncia);
    pausa();
    cy.then(() => avisos.push(avisoCancelamento));
    notificacaoAoVivo(avisoCancelamento);
    cy.get('.notification-bell__badge').should('contain', '2');
    pausa();
    cy.get('.notification-bell__trigger').click();
    cy.contains('.notification-bell__item', 'Atendimento cancelado').should('be.visible');
    pausa(RITMO.leitura);
    pausa(RITMO.leitura);
    cy.get('.notification-bell__trigger').click();
    cy.contains('app-request-card', `#${SOLICITACAO_ID}`).should('contain', 'Recebendo propostas');
    pausa();
    cy.contains('app-request-card', `#${SOLICITACAO_ID}`).contains('button', 'Visualizar').click();
    cy.contains('ui-proposal-card', CAMILA.nome).scrollIntoView().should('contain', 'Cancelada');
    pausa(RITMO.leitura);
  });
});
