import { route } from '../../support/api';
import { localDateTime } from '../../support/factories';
import {
  CAMILA,
  DIEGO,
  MARIANA,
  PERIODO,
  RAFAEL,
  SOLICITACAO_ID,
  aceitaDe,
  atendimentoDe,
  avisoPara,
  propostaDe,
  sessaoPacienteDemo,
  sessaoProfissionalDemo,
  solicitacaoMariana,
  vagas,
} from '../support/elenco';
import { RITMO, entrar, legenda, notificacaoAoVivo, pausa, quem } from '../support/estudio';

const painelDe = (nome: string) => cy.contains('ui-proposal-card', nome).find('section[aria-label="Atendimento"]');

describe('Cena 7 · Reagendar', () => {
  it('Rafael propõe nova data e Mariana aceita', () => {
    let remarcacao: { inicio: string; termino: string; solicitadaPor: string; solicitadaEm: string } | undefined;
    let periodo = PERIODO.rafael;
    const rafaelAtual = () => aceitaDe(RAFAEL, { ...periodo, remarcacao });
    const atendimentoAtual = () => atendimentoDe(RAFAEL, { ...periodo, remarcacao });
    const aviso = avisoPara(
      'PACIENTE',
      'REMARCACAO_SOLICITADA',
      'Pedido de remarcação',
      `${RAFAEL.nome} pediu para remarcar o atendimento.`,
      `/patient/solicitacoes/${SOLICITACAO_ID}`,
    );

    cy.intercept(route('GET', '/propostas'), (req) => req.reply([rafaelAtual()]));
    cy.intercept(route('POST', '/atendimentos/501/remarcacao'), (req) => {
      remarcacao = { ...PERIODO.rafaelRemarcado, solicitadaPor: 'PROFISSIONAL', solicitadaEm: new Date().toISOString() };
      req.reply(atendimentoAtual());
    });
    cy.intercept(route('PATCH', '/atendimentos/501/remarcacao/aceitar'), (req) => {
      periodo = PERIODO.rafaelRemarcado;
      remarcacao = undefined;
      req.reply(atendimentoAtual());
    });
    cy.intercept(route('GET', `/solicitacoes/${SOLICITACAO_ID}`), solicitacaoMariana({ status: 'EM_ANDAMENTO', totalPropostas: 3, profissionais: vagas(true, true) }));
    cy.intercept(route('GET', `/solicitacoes/${SOLICITACAO_ID}/propostas`), (req) =>
      req.reply([rafaelAtual(), aceitaDe(CAMILA), propostaDe(DIEGO, { status: 'RECUSADA' })]),
    );
    cy.intercept(route('GET', '/solicitacoes'), [solicitacaoMariana({ status: 'EM_ANDAMENTO', totalPropostas: 3, profissionais: vagas(true, true) })]);
    cy.intercept(route('GET', '/notificacoes'), (req) => req.reply(remarcacao ? [aviso] : []));
    cy.intercept(route('PATCH', /^\/notificacoes\/\d+\/lida$/), { ...aviso, lida: true });

    entrar('/professional/propostas', sessaoProfissionalDemo(RAFAEL));
    legenda('Cena 7 · Reagendar', 'Rafael Lima, enfermeiro');
    cy.get('section[aria-label="Atendimento"]').should('contain', 'Agendado');
    pausa(RITMO.leitura);
    cy.get('section[aria-label="Atendimento"]').contains('button', 'Remarcar').click();
    cy.dialog('Remarcar atendimento').within(() => {
      cy.field('Novo início').clear().type(localDateTime(4, 14));
      cy.field('Novo término').clear().type(localDateTime(4, 16));
      pausa(600);
      cy.button('Pedir remarcação').click();
    });
    cy.toast('Pedido de remarcação enviado.').should('be.visible');
    cy.get('section[aria-label="Atendimento"]').should('contain', 'Aguardando a resposta.');
    pausa(RITMO.leitura);

    quem(`${MARIANA.nome}, paciente`);
    entrar('/patient', sessaoPacienteDemo());
    pausa(600);
    notificacaoAoVivo(aviso);
    cy.get('.notification-bell__badge').should('contain', '1');
    pausa();
    cy.get('.notification-bell__trigger').click();
    cy.contains('.notification-bell__item', 'Pedido de remarcação').click();
    painelDe(RAFAEL.nome).should('contain', `${RAFAEL.nome} pediu para remarcar para`);
    pausa(RITMO.leitura);
    painelDe(RAFAEL.nome).contains('button', 'Aceitar remarcação').click();
    cy.toast('Remarcação aceita.').should('be.visible');
    pausa(RITMO.leitura);
  });
});
