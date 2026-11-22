import { api, route } from '../../support/api';
import { DESTAQUES, avaliacaoPendente, avaliacoesPendentes, inHours } from '../../support/factories';
import {
  CAMILA,
  DIEGO,
  MARIANA,
  RAFAEL,
  SOLICITACAO_ID,
  aceitaDe,
  perfilProfissionalDe,
  propostaDe,
  sessaoPacienteDemo,
  sessaoProfissionalDemo,
  solicitacaoMariana,
  vagas,
} from '../support/elenco';
import { RITMO, entrar, legenda, pausa, quem } from '../support/estudio';

const ATENDIMENTO_RAFAEL = 501;

function avaliar(estrelas: number, destaques: string[]) {
  cy.get('.pending-ratings-card').contains('button', 'Avaliar').click();
  cy.dialog('Avaliar atendimento').within(() => {
    cy.contains('A avaliação é anônima').should('be.visible');
    pausa();
    cy.get('[role="radio"]').eq(estrelas - 1).click();
    destaques.forEach((destaque) => cy.contains('button', destaque).click());
    pausa();
    cy.button('Sim, enviar a avaliação').click();
  });
  cy.toast('Avaliação enviada. Obrigado por contar como foi.').should('be.visible');
}

describe('Cena 10 · Fim do atendimento e avaliação', () => {
  it('o atendimento termina e os dois se avaliam', () => {
    const periodo = { inicio: inHours(-2.2), termino: inHours(-0.2) };
    const finalizado = aceitaDe(RAFAEL, { status: 'FINALIZADO', ...periodo });
    const solicitacao = solicitacaoMariana({ status: 'EM_ANDAMENTO', totalPropostas: 3, profissionais: vagas(true, true) });
    const pendenteMariana = avaliacaoPendente({
      atendimentoId: ATENDIMENTO_RAFAEL,
      solicitacaoId: SOLICITACAO_ID,
      servico: 'Enfermeiro(a) · Curativos',
      nomeAvaliado: RAFAEL.nome,
      ...periodo,
      prazo: inHours(30 * 24),
    });
    const pendenteRafael = { ...pendenteMariana, nomeAvaliado: MARIANA.nome };
    let marianaAvaliou = false;
    let rafaelAvaliou = false;

    api('GET', '/solicitacoes', [solicitacao]);
    api('GET', `/solicitacoes/${SOLICITACAO_ID}`, solicitacao);
    api('GET', `/solicitacoes/${SOLICITACAO_ID}/propostas`, [finalizado, aceitaDe(CAMILA), propostaDe(DIEGO, { status: 'RECUSADA' })]);
    api('GET', '/propostas', [finalizado]);
    cy.intercept(route('GET', '/avaliacoes/pendentes'), (req) => req.reply(avaliacoesPendentes(marianaAvaliou ? [] : [pendenteMariana])));
    cy.intercept(route('POST', `/avaliacoes/atendimentos/${ATENDIMENTO_RAFAEL}`), (req) => {
      if (marianaAvaliou) {
        rafaelAvaliou = true;
      } else {
        marianaAvaliou = true;
      }
      req.reply(avaliacoesPendentes());
    });
    api(
      'GET',
      `/profissionais/${RAFAEL.usuarioId}/perfil`,
      perfilProfissionalDe(RAFAEL, {
        avaliacoes: { media: 5, total: 1, destaques: [{ ...DESTAQUES[0], total: 1 }, { ...DESTAQUES[1], total: 1 }] },
      }),
    );

    entrar(`/patient/solicitacoes/${SOLICITACAO_ID}`, sessaoPacienteDemo());
    legenda('Cena 10 · Fim do atendimento e avaliação', 'Mariana Souza, paciente');
    cy.contains('ui-proposal-card', RAFAEL.nome).find('section[aria-label="Atendimento"]').should('contain', 'Finalizado');
    cy.contains('ui-proposal-card', RAFAEL.nome).scrollIntoView();
    pausa(RITMO.leitura);

    cy.get('.ui-app-header').contains('a', 'Minhas solicitações').click();
    cy.get('.pending-ratings-card').should('contain', `com ${RAFAEL.nome}`);
    pausa(RITMO.leitura);
    avaliar(5, ['Pontualidade', 'Educação']);
    pausa();

    quem('Rafael Lima, enfermeiro');
    cy.intercept(route('GET', '/avaliacoes/pendentes'), (req) => req.reply(avaliacoesPendentes(rafaelAvaliou ? [] : [pendenteRafael])));
    entrar('/professional', sessaoProfissionalDemo(RAFAEL));
    cy.get('.pending-ratings-card').should('contain', 'Conte como foi com o paciente.');
    pausa();
    avaliar(5, ['Boa comunicação']);
    pausa();

    quem(`${MARIANA.nome}, paciente`);
    entrar(`/patient/profissionais/${RAFAEL.usuarioId}`, sessaoPacienteDemo());
    cy.contains('h1', RAFAEL.nome).should('be.visible');
    cy.contains('Pontualidade').scrollIntoView().should('be.visible');
    pausa(RITMO.leitura);
  });
});
