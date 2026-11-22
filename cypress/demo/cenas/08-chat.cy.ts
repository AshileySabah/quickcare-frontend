import { api } from '../../support/api';
import { CAMILA, MARIANA, RAFAEL, SOLICITACAO_ID, sessaoPacienteDemo, sessaoProfissionalDemo } from '../support/elenco';
import { RITMO, entrar, legenda, mensagemAoVivo, pausa, quem } from '../support/estudio';
import { ChatAoVivo } from '../support/roteiro';

const campo = () => cy.get('textarea[aria-label="Mensagem"]');
const enviar = () => cy.get('button[aria-label="Enviar mensagem"]').click();
const individualCom = (nome: string) =>
  cy.get('.chat-shell__list .item').filter(':contains("Individual")').filter(`:contains("${nome}")`).first();

describe('Cena 8 · Chat', () => {
  it('Mariana conversa com Rafael e Camila no grupo e com Rafael em particular', () => {
    const chat = new ChatAoVivo([RAFAEL, CAMILA]);
    chat.ligar();

    entrar(`/patient/mensagens/${SOLICITACAO_ID}/grupo`, sessaoPacienteDemo());
    legenda('Cena 8 · Chat', 'Mariana Souza, paciente');
    cy.contains(`Grupo · Solicitação #${SOLICITACAO_ID}`).should('be.visible');
    pausa();

    campo().type('Oi, Rafael e Camila! Podemos combinar como vai ser na quinta?');
    pausa(500);
    enviar();
    cy.contains('.chat__row--mine', 'Podemos combinar').should('be.visible');
    pausa(RITMO.leitura);

    mensagemAoVivo(() => chat.semear(RAFAEL, 'Oi, Mariana! Chego às 14h para o curativo, leva uns 40 minutos.', null));
    cy.contains('.chat__row', 'Chego às 14h').should('be.visible');
    pausa(RITMO.leitura);

    mensagemAoVivo(() => chat.semear(CAMILA, 'Eu chego às 8h e fico até as 18h. Posso deixar o almoço pronto também.', null));
    cy.contains('.chat__row', 'Eu chego às 8h').should('be.visible');
    pausa(RITMO.leitura);

    campo().type('Perfeito, obrigada aos dois!');
    enviar();
    pausa(RITMO.leitura);

    individualCom(RAFAEL.nome).click();
    cy.location('pathname').should('eq', `/patient/mensagens/${SOLICITACAO_ID}/${RAFAEL.usuarioId}`);
    pausa();
    campo().type('Rafael, segue a receita do curativo que o médico passou.');
    cy.get('.chat__form input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('%PDF-1.4 demo'), fileName: 'receita-curativo.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.contains('.chat__selected', 'receita-curativo.pdf').should('be.visible');
    pausa(600);
    enviar();
    cy.contains('a.chat__file', 'receita-curativo.pdf').should('be.visible');
    pausa(RITMO.leitura);

    cy.then(() => {
      chat.remetente = RAFAEL;
    });
    api('GET', '/conversas/nao-lidas', {
      total: 1,
      canais: [{ solicitacaoId: SOLICITACAO_ID, profissionalUsuarioId: RAFAEL.usuarioId, quantidade: 1 }],
    });
    quem('Rafael Lima, enfermeiro');
    entrar('/professional/mensagens', sessaoProfissionalDemo(RAFAEL));
    cy.get('.ui-app-header').contains('a', 'Mensagens').should('contain', '1');
    pausa(RITMO.leitura);
    individualCom(MARIANA.nome).click();
    cy.contains('a.chat__file', 'receita-curativo.pdf').should('be.visible');
    pausa(RITMO.leitura);
    campo().type('Recebi, Mariana! Vou levar o material indicado na receita.');
    enviar();
    pausa(RITMO.leitura);
  });
});
