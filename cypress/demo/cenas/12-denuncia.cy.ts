import { api } from '../../support/api';
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
  solicitacaoMariana,
  vagas,
} from '../support/elenco';
import { RITMO, entrar, legenda, mensagemAoVivo, pausa } from '../support/estudio';
import { ChatAoVivo } from '../support/roteiro';

const RELATO =
  'A Camila me mandou mensagem dizendo que só vem amanhã se eu pagar R$ 300 por fora, fora do valor combinado na proposta.';

describe('Cena 12 · Denúncia', () => {
  it('Camila cobra por fora no chat e Mariana denuncia', () => {
    const chat = new ChatAoVivo([RAFAEL, CAMILA]);
    chat.semear(CAMILA, 'Bom dia, Mariana! Amanhã chego às 8h.', CAMILA);
    chat.semear(MARIANA, 'Combinado, obrigada!', CAMILA);
    chat.ligar();
    const solicitacao = solicitacaoMariana({ status: 'EM_ANDAMENTO', totalPropostas: 3, profissionais: vagas(true, true) });
    api('GET', '/solicitacoes', [solicitacao]);
    api('GET', `/solicitacoes/${SOLICITACAO_ID}`, solicitacao);
    api('GET', `/solicitacoes/${SOLICITACAO_ID}/propostas`, [
      aceitaDe(RAFAEL, { status: 'FINALIZADO' }),
      aceitaDe(CAMILA),
      propostaDe(DIEGO, { status: 'RECUSADA', profissional: { perfilIndisponivel: true, nome: null } }),
    ]);
    api('GET', `/profissionais/${CAMILA.usuarioId}/perfil`, perfilProfissionalDe(CAMILA, { podeDenunciar: true }));
    api('POST', '/denuncias', { id: 600 });

    entrar(`/patient/mensagens/${SOLICITACAO_ID}/${CAMILA.usuarioId}`, sessaoPacienteDemo());
    legenda('Cena 12 · Denúncia', 'Mariana Souza, paciente');
    cy.contains('.chat__row', 'Amanhã chego às 8h').should('be.visible');
    pausa();
    mensagemAoVivo(() =>
      chat.semear(CAMILA, 'Mariana, só vou amanhã se você me pagar mais R$ 300 por fora. Não comenta isso no aplicativo.', CAMILA),
    );
    cy.contains('.chat__row', 'R$ 300 por fora').should('be.visible');
    pausa(RITMO.leitura);
    pausa(RITMO.leitura);

    cy.get('.ui-app-header').contains('a', 'Minhas solicitações').click();
    cy.contains('app-request-card', `#${SOLICITACAO_ID}`).contains('button', 'Visualizar').click();
    cy.get(`[aria-label="Opções para ${CAMILA.nome}"]`).click();
    cy.contains('[role="menuitem"]', 'Ver perfil').click();
    cy.contains('h1', CAMILA.nome).should('be.visible');
    pausa();

    cy.button('Denunciar').click();
    cy.dialog('Denunciar').within(() => {
      cy.contains('A pessoa denunciada não fica sabendo que foi você.').should('be.visible');
      pausa();
      cy.selectField('Motivo', 'cobranca_indevida');
      cy.fillField('O que aconteceu', RELATO);
      cy.attachFile('Prova (opcional)', 'print-da-conversa.png', 'image/png');
      pausa();
      cy.button('Sim, enviar a denúncia').click();
    });
    cy.toast('Denúncia enviada.').should('be.visible');
    cy.dialog('Bloquear também?').within(() => {
      pausa(RITMO.leitura);
      cy.button('Não, só denunciar').click();
    });
    cy.button('Denúncia em andamento').should('be.disabled');
    pausa(RITMO.leitura);
  });
});
