import { api, apiSequence } from '../../support/api';
import { dateOnly } from '../../support/factories';
import { DESCRICAO_SOLICITACAO, sessaoPacienteDemo, solicitacaoMariana } from '../support/elenco';
import { RITMO, entrar, legenda, pausa } from '../support/estudio';

describe('Cena 4 · Paciente cria uma solicitação', () => {
  it('Mariana pede um enfermeiro e uma cuidadora', () => {
    apiSequence('GET', '/solicitacoes', [{ body: [] }, { body: [solicitacaoMariana()] }]);
    api('POST', '/solicitacoes', solicitacaoMariana());

    entrar('/patient', sessaoPacienteDemo());
    legenda('Cena 4 · Paciente cria uma solicitação', 'Mariana Souza, paciente');
    cy.contains('Nenhuma solicitação ativa').should('be.visible');
    pausa();
    cy.button('Nova solicitação').click();
    cy.contains('h1', 'Nova solicitação').should('be.visible');
    pausa();

    cy.get('.requested-professionals-card__row')
      .eq(0)
      .within(() => {
        cy.selectField('Categoria', 'ENFERMEIRO');
        cy.multiSelect('Especialidades', ['Curativos']);
        cy.fillField('Quantidade', '1');
      });
    pausa(600);
    cy.button('+ Adicionar profissional').click();
    cy.get('.requested-professionals-card__row')
      .eq(1)
      .within(() => {
        cy.selectField('Categoria', 'CUIDADOR');
        cy.multiSelect('Especialidades', ['Acompanhante de idosos']);
        cy.fillField('Quantidade', '1');
      });
    cy.contains('Total: 2 profissionais').should('be.visible');
    pausa();

    cy.fillField('Descreva sua necessidade', DESCRICAO_SOLICITACAO);
    cy.field('Prazo desejado').type(dateOnly(3));
    cy.selectField('Modalidade', 'presencial');
    pausa();

    cy.fillField('CEP', '04538133');
    cy.field('Logradouro').should('have.value', 'Avenida Brigadeiro Faria Lima');
    cy.fillField('Número', '3477');
    cy.fillField('Complemento', 'Apto 52');
    pausa();

    cy.button('Criar solicitação').click();
    cy.location('pathname').should('eq', '/patient');
    cy.contains('app-request-card', `#${solicitacaoMariana().id}`).should('contain', 'Recebendo propostas');
    pausa(RITMO.leitura);
  });
});
