import { api, route } from '../../support/api';
import { inDays, previaBloqueio } from '../../support/factories';
import {
  CAMILA,
  DIEGO,
  RAFAEL,
  SOLICITACAO_ID,
  aceitaDe,
  propostaDe,
  sessaoPacienteDemo,
  sessaoProfissionalDemo,
  solicitacaoMariana,
  vagas,
} from '../support/elenco';
import { RITMO, entrar, legenda, pausa, quem } from '../support/estudio';

describe('Cena 11 · Bloqueio', () => {
  it('Mariana bloqueia o Diego e ele deixa de vê-la', () => {
    let bloqueado = false;
    const diegoNaLista = () =>
      propostaDe(DIEGO, {
        status: 'RECUSADA',
        profissional: bloqueado ? { perfilIndisponivel: true, nome: null } : {},
      });
    const bloqueio = { id: 60, perfilId: DIEGO.usuarioId, nome: DIEGO.nome, avatarUrl: null, criadoEm: inDays(0) };
    const solicitacao = solicitacaoMariana({ status: 'EM_ANDAMENTO', totalPropostas: 3, profissionais: vagas(true, true) });

    api('GET', `/solicitacoes/${SOLICITACAO_ID}`, solicitacao);
    cy.intercept(route('GET', `/solicitacoes/${SOLICITACAO_ID}/propostas`), (req) =>
      req.reply([aceitaDe(RAFAEL, { status: 'FINALIZADO' }), aceitaDe(CAMILA), diegoNaLista()]),
    );
    api('GET', `/bloqueios/profissionais/${DIEGO.usuarioId}/previa`, previaBloqueio({ nome: DIEGO.nome }));
    cy.intercept(route('POST', `/bloqueios/profissionais/${DIEGO.usuarioId}`), (req) => {
      bloqueado = true;
      req.reply(bloqueio);
    });
    cy.intercept(route('GET', '/bloqueios'), (req) => req.reply(bloqueado ? [bloqueio] : []));

    entrar(`/patient/solicitacoes/${SOLICITACAO_ID}`, sessaoPacienteDemo());
    legenda('Cena 11 · Bloqueio', 'Mariana Souza, paciente');
    cy.contains('ui-proposal-card', DIEGO.nome).scrollIntoView();
    pausa(RITMO.leitura);
    cy.get(`[aria-label="Opções para ${DIEGO.nome}"]`).click();
    cy.contains('[role="menuitem"]', 'Bloquear').click();
    cy.dialog('Bloquear').within(() => {
      cy.contains(`Bloquear ${DIEGO.nome}?`).should('be.visible');
      pausa(RITMO.leitura);
      cy.button('Sim, bloquear o profissional').click();
    });
    cy.toast(`Pronto, você bloqueou ${DIEGO.nome}.`).should('be.visible');
    cy.contains('Perfil não disponível').should('be.visible');
    pausa(RITMO.leitura);

    cy.get('[aria-label="Abrir menu da conta"]').click();
    cy.contains('[role="menuitem"]', 'Segurança').click();
    cy.contains('.blocked-users__item', DIEGO.nome).scrollIntoView().should('be.visible');
    pausa(RITMO.leitura);

    quem('Diego Alves, enfermeiro');
    api('GET', '/propostas', [propostaDe(DIEGO, { status: 'RECUSADA', solicitacao: { pacienteIndisponivel: true, pacienteNome: undefined } })]);
    entrar('/professional', sessaoProfissionalDemo(DIEGO));
    cy.contains('Nenhuma solicitação aberta').should('be.visible');
    pausa(RITMO.leitura);
    cy.get('.ui-app-header').contains('Histórico').click();
    cy.contains('Perfil não disponível').should('be.visible');
    pausa(RITMO.leitura);
  });
});
