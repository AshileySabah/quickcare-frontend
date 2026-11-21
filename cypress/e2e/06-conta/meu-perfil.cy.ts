import { api, apiError } from '../../support/api';
import { perfilPaciente, perfilProfissional, resumoAvaliacoes, sessaoPaciente, sessaoProfissional } from '../../support/factories';

describe('Meu perfil · paciente', () => {
  it('abre pelo menu da conta com os dados atuais e as avaliações recebidas', () => {
    api('GET', '/perfil/paciente', perfilPaciente({ avaliacoes: resumoAvaliacoes(4, 3) }));
    cy.visitAs('/patient', sessaoPaciente());
    cy.get('[aria-label="Abrir menu da conta"]').click();
    cy.contains('[role="menuitem"]', 'Meu perfil').click();
    cy.location('pathname').should('eq', '/patient/perfil');
    cy.field('Nome completo').should('have.value', 'Ana Paciente');
    cy.field('Alergias').should('have.value', 'Dipirona');
    cy.contains('label', 'CPF').should('not.exist');
    cy.contains('label', 'E-mail').should('not.exist');
    cy.get('.ui-rating-summary').should('contain', '4,0').and('contain', '3 avaliações');
  });

  it('salva as alterações', () => {
    api('PUT', '/perfil/paciente', { mensagem: 'Dados atualizados.', perfil: perfilPaciente({ nome: 'Ana P. Silva' }) }).as('salvar');
    cy.visitAs('/patient/perfil', sessaoPaciente());
    cy.fillField('Nome completo', 'Ana P. Silva');
    cy.fillField('Condições de saúde', 'Hipertensão');
    cy.button('Salvar alterações').click();
    cy.wait('@salvar').its('request.headers.content-type').should('include', 'multipart/form-data');
    cy.toast('Dados atualizados.').should('be.visible');
  });

  it('nome vazio não é enviado', () => {
    cy.visitAs('/patient/perfil', sessaoPaciente());
    cy.field('Nome completo').clear();
    cy.button('Salvar alterações').click();
    cy.contains('Campo obrigatório.').should('be.visible');
  });

  it('declarações ficam travadas', () => {
    cy.visitAs('/patient/perfil', sessaoPaciente());
    cy.contains('.ui-checkbox', 'Confirmo que as informações').find('input').should('be.disabled');
  });

  it('erro ao carregar permite tentar de novo', () => {
    apiError('GET', '/perfil/paciente', 'Não foi possível carregar seus dados.', 500);
    cy.visitAs('/patient/perfil', sessaoPaciente());
    cy.contains('Não foi possível carregar seus dados.').should('be.visible');
  });

  it('erro ao salvar aparece', () => {
    apiError('PUT', '/perfil/paciente', 'Você não possui um perfil de paciente ativo.', 403);
    cy.visitAs('/patient/perfil', sessaoPaciente());
    cy.button('Salvar alterações').click();
    cy.toast('Você não possui um perfil de paciente ativo.').should('be.visible');
  });
});

describe('Meu perfil · profissional', () => {
  it('carrega modalidade e raio e salva', () => {
    api('PUT', '/perfil/profissional', { mensagem: 'Perfil atualizado.', perfil: perfilProfissional() }).as('salvar');
    cy.visitAs('/professional/perfil', sessaoProfissional());
    cy.contains('.ui-checkbox', 'Atendo presencialmente').find('input').should('be.checked');
    cy.field('Raio de atendimento (km)').should('have.value', '10');
    cy.fillField('Raio de atendimento (km)', '25');
    cy.button('Salvar alterações').click();
    cy.wait('@salvar');
    cy.toast('Perfil atualizado.').should('be.visible');
  });

  it('exige pelo menos uma modalidade de atendimento', () => {
    cy.visitAs('/professional/perfil', sessaoProfissional());
    cy.contains('.ui-checkbox', 'Atendo presencialmente').click();
    cy.contains('.ui-checkbox', 'Atendo remotamente').click();
    cy.button('Salvar alterações').click();
    cy.get('.professional-practice-card__error').should('be.visible');
  });
});
