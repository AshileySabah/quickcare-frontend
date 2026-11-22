import { api } from '../../support/api';
import { CNPJ_RAFAEL, RAFAEL, sessaoProfissionalDemo } from '../support/elenco';
import { RITMO, legenda, pausa, visitar } from '../support/estudio';
import { ValidacaoAoVivo } from '../support/roteiro';

function pdf(nome: string) {
  return { contents: Cypress.Buffer.from('%PDF-1.4 demo'), fileName: nome, mimeType: 'application/pdf' };
}

describe('Cena 2 · Cadastro do profissional', () => {
  it('Rafael cria a conta de enfermeiro', () => {
    api('POST', '/usuarios/cadastro/profissional', {
      usuarioId: RAFAEL.usuarioId,
      perfilId: RAFAEL.usuarioId,
      nome: RAFAEL.nome,
      email: RAFAEL.email,
      tipoPerfil: 'PROFISSIONAL',
      confirmacaoEmailPendente: true,
    });
    api('POST', '/auth/confirmacao-email/confirmar', sessaoProfissionalDemo(RAFAEL, 'PENDENTE'));
    new ValidacaoAoVivo(RAFAEL, 'PROFISSIONAL').ligarPessoa();

    visitar('/');
    legenda('Cena 2 · Cadastro do profissional', 'Rafael Lima, enfermeiro');
    pausa();
    cy.button('Quero atender').click();
    cy.contains('h1', 'Cadastro de profissional').should('be.visible');
    pausa();

    cy.fillField('Nome completo', RAFAEL.nome);
    cy.fillField('E-mail', RAFAEL.email);
    cy.fillField('Telefone', '11976543210');
    cy.fillField('CPF', '40442820135');
    cy.selectField('Documento de identidade', 'RG');
    cy.fillField('Número do documento', '123456782');
    cy.selectField('UF emissora', 'SP');
    cy.field('Data de nascimento').type('1991-08-22');
    cy.selectField('Gênero', 'MASCULINO');
    cy.fillField('CNPJ', CNPJ_RAFAEL);
    pausa();

    cy.selectField('Categoria profissional', 'ENFERMEIRO');
    cy.multiSelect('Especialidades', ['Curativos', 'Sondagem']);
    cy.fillField('COREN', '458213');
    cy.selectField('UF do registro', 'SP');
    cy.attachFile('Documento do registro', 'coren-rafael.pdf');
    pausa();

    cy.contains('.ui-checkbox', 'Atendo presencialmente').click();
    cy.fillField('Raio de atendimento (km)', '15');
    pausa();

    cy.fillField('CEP', '04538133');
    cy.field('Logradouro').should('have.value', 'Avenida Brigadeiro Faria Lima');
    cy.fillField('Número', '1200');
    pausa();

    cy.get('.ui-document-uploader__input').selectFile([pdf('cpf-rafael.pdf'), pdf('rg-rafael.pdf'), pdf('cartao-cnpj-rafael.pdf')], {
      force: true,
    });
    cy.get('.ui-document-uploader__type-select').eq(0).select('COMPROVANTE_CPF');
    cy.get('.ui-document-uploader__type-select').eq(1).select('VALIDACAO_CPF');
    cy.get('.ui-document-uploader__type-select').eq(2).select('VALIDACAO_CNPJ');
    pausa();

    cy.fillField('Senha', 'Senha@123');
    cy.fillField('Confirmar senha', 'Senha@123');
    cy.contains('.ui-checkbox', 'Confirmo que as informações fornecidas são verdadeiras').click();
    cy.contains('.ui-checkbox', 'Consinto com o tratamento dos meus dados pessoais').click();
    pausa();
    cy.button('Criar conta').click();

    cy.location('pathname').should('eq', '/cadastro/confirme-seu-email');
    pausa(RITMO.leitura);

    visitar('/confirmar-email?token=link-do-email');
    cy.location('pathname').should('eq', '/professional/aguardando-validacao');
    cy.contains('Cadastro em análise').should('be.visible');
    pausa(RITMO.leitura);
  });
});
