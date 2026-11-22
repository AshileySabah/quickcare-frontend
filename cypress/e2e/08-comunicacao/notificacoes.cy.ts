import { api, apiError, route } from '../../support/api';
import { notificacao, proposta, sessaoAmbos, sessaoPaciente, solicitacao } from '../../support/factories';

const sino = () => cy.get('.notification-bell__trigger');

describe('Notificações', () => {
  it('sem notificações mostra o vazio', () => {
    cy.visitAs('/patient', sessaoPaciente());
    sino().click();
    cy.contains('Nenhuma notificação por aqui.').should('be.visible');
  });

  it('mostra o contador e a lista do perfil ativo', () => {
    api('GET', '/notificacoes/nao-lidas', { paciente: 2, profissional: 0 });
    api('GET', '/notificacoes', [
      notificacao(),
      notificacao({ id: 41, tipo: 'LEMBRETE_ATENDIMENTO', titulo: 'Atendimento amanhã', mensagem: 'Seu atendimento começa amanhã às 9h.', lida: true }),
    ]);
    cy.visitAs('/patient', sessaoPaciente());
    cy.get('.notification-bell__badge').should('contain', '2');
    sino().click();
    cy.get('.notification-bell__item').should('have.length', 2);
    cy.get('.notification-bell__item--unread').should('have.length', 1).and('contain', 'Nova proposta');
  });

  it('pede a lista com o perfil ativo', () => {
    cy.intercept(route('GET', '/notificacoes'), []).as('lista');
    cy.visitAs('/patient', sessaoPaciente());
    cy.wait('@lista').its('request.query.perfil').should('eq', 'PACIENTE');
  });

  it('abrir uma notificação marca como lida e navega para o link', () => {
    api('GET', '/notificacoes/nao-lidas', { paciente: 1, profissional: 0 });
    api('GET', '/notificacoes', [notificacao()]);
    api('PATCH', '/notificacoes/40/lida', { ...notificacao(), lida: true }).as('lida');
    api('GET', '/solicitacoes/100', solicitacao());
    api('GET', '/solicitacoes/100/propostas', [proposta()]);
    cy.visitAs('/patient', sessaoPaciente());
    sino().click();
    cy.contains('.notification-bell__item', 'Nova proposta').click();
    cy.wait('@lida');
    cy.location('pathname').should('eq', '/patient/solicitacoes/100');
  });

  it('marca todas como lidas', () => {
    api('GET', '/notificacoes/nao-lidas', { paciente: 2, profissional: 0 });
    api('GET', '/notificacoes', [notificacao(), notificacao({ id: 41 })]);
    cy.intercept(route('PATCH', '/notificacoes/lidas'), { paciente: 0, profissional: 0 }).as('todas');
    cy.visitAs('/patient', sessaoPaciente());
    sino().click();
    cy.button('Marcar todas como lidas').click();
    cy.wait('@todas').its('request.query.perfil').should('eq', 'PACIENTE');
    cy.get('.notification-bell__item--unread').should('have.length', 0);
    cy.get('.notification-bell__badge').should('not.exist');
  });

  it('falha ao carregar permite tentar de novo', () => {
    apiError('GET', '/notificacoes', 'erro', 500);
    cy.visitAs('/patient', sessaoPaciente());
    sino().click();
    cy.contains('Não foi possível carregar as notificações.').should('be.visible');
    api('GET', '/notificacoes', [notificacao()]);
    cy.button('Tentar de novo').click();
    cy.contains('.notification-bell__item', 'Nova proposta').should('be.visible');
  });

  it('não lidas do outro perfil aparecem no seletor de perfil', () => {
    api('GET', '/notificacoes/nao-lidas', { paciente: 0, profissional: 1 });
    cy.visitAs('/patient', sessaoAmbos('PACIENTE'));
    cy.get('[aria-label="1 notificação não lida"]').should('be.visible');
  });
});
