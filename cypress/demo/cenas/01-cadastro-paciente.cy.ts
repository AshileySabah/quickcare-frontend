import { api } from '../../support/api';
import { MARIANA, sessaoPacienteDemo } from '../support/elenco';
import { RITMO, legenda, pausa, visitar } from '../support/estudio';
import { ValidacaoAoVivo } from '../support/roteiro';

function pdf(nome: string) {
  return { contents: Cypress.Buffer.from('%PDF-1.4 demo'), fileName: nome, mimeType: 'application/pdf' };
}

describe('Cena 1 · Cadastro da paciente', () => {
  it('Mariana cria a conta de paciente', () => {
    api('POST', '/usuarios/cadastro/paciente', {
      usuarioId: MARIANA.usuarioId,
      perfilId: MARIANA.usuarioId,
      nome: MARIANA.nome,
      email: MARIANA.email,
      tipoPerfil: 'PACIENTE',
      confirmacaoEmailPendente: true,
    });
    api('POST', '/auth/confirmacao-email/confirmar', sessaoPacienteDemo('PENDENTE'));
    new ValidacaoAoVivo(MARIANA, 'PACIENTE').ligarPessoa();

    visitar('/');
    legenda('Cena 1 · Cadastro da paciente', 'Mariana Souza, paciente');
    pausa(RITMO.leitura);
    cy.button('Quero ser atendido').click();
    cy.contains('h1', 'Cadastro de paciente').should('be.visible');
    pausa();

    cy.fillField('Nome completo', MARIANA.nome);
    cy.fillField('E-mail', MARIANA.email);
    cy.fillField('Telefone', '11987654321');
    cy.fillField('CPF', '52998224725');
    cy.selectField('Documento de identidade', 'RG');
    cy.fillField('Número do documento', '123456782');
    cy.selectField('UF emissora', 'SP');
    cy.field('Data de nascimento').type('1991-03-14');
    cy.selectField('Gênero', 'FEMININO');
    pausa();

    cy.fillField('CEP', '04538133');
    cy.field('Logradouro').should('have.value', 'Avenida Brigadeiro Faria Lima');
    pausa();
    cy.fillField('Número', '3477');
    cy.fillField('Complemento', 'Apto 52');
    pausa();

    cy.fillField('Alergias', 'Dipirona');
    cy.fillField('Condições de saúde', 'Recuperação de cirurgia no joelho direito.');
    cy.fillField('Medicamentos em uso', 'Anti-inflamatório de 12 em 12 horas.');
    pausa();

    cy.button('+ Adicionar contato').click();
    cy.get('.emergency-contacts-card__row')
      .first()
      .within(() => {
        cy.fillField('Nome', 'Paulo Souza');
        cy.fillField('Telefone', '11991234567');
      });
    pausa();

    cy.get('.ui-document-uploader__input').selectFile([pdf('cpf-mariana.pdf'), pdf('rg-mariana.pdf')], { force: true });
    cy.get('.ui-document-uploader__type-select').eq(0).select('COMPROVANTE_CPF');
    cy.get('.ui-document-uploader__type-select').eq(1).select('VALIDACAO_CPF');
    pausa();

    cy.fillField('Senha', 'Senha@123');
    cy.fillField('Confirmar senha', 'Senha@123');
    cy.contains('.ui-checkbox', 'Confirmo que as informações fornecidas são verdadeiras').click();
    cy.contains('.ui-checkbox', 'Consinto com o tratamento dos meus dados pessoais').click();
    pausa();
    cy.button('Criar conta').click();

    cy.location('pathname').should('eq', '/cadastro/confirme-seu-email');
    cy.contains(MARIANA.email).should('be.visible');
    pausa(RITMO.leitura);

    visitar('/confirmar-email?token=link-do-email');
    cy.location('pathname').should('eq', '/patient');
    cy.contains('Seu cadastro está em validação').should('be.visible');
    pausa(RITMO.leitura);
  });
});
