import { api, apiError } from '../../support/api';
import {
  avaliacaoPendente,
  avaliacoesPendentes,
  sessaoPaciente,
  sessaoProfissional,
  solicitacao,
} from '../../support/factories';

const card = () => cy.get('.pending-ratings-card');

describe('Avaliação', () => {
  it('sem pendências não mostra o card', () => {
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('h1', 'Minhas solicitações').should('be.visible');
    card().should('not.exist');
  });

  it('paciente avalia com nota e destaques', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes([avaliacaoPendente()]));
    api('POST', '/avaliacoes/atendimentos/500', avaliacoesPendentes()).as('avaliar');
    cy.visitAs('/patient', sessaoPaciente());
    card().within(() => {
      cy.contains('Avalie seus atendimentos').should('be.visible');
      cy.contains('Enfermeiro(a) · Curativos com Bruno Enfermeiro').should('be.visible');
      cy.button('Avaliar').click();
    });
    cy.dialog('Avaliar atendimento').within(() => {
      cy.contains('A avaliação é anônima').should('be.visible');
      cy.get('[role="radio"]').eq(3).click();
      cy.contains('button', 'Pontualidade').click();
      cy.contains('button', 'Atraso').click();
      cy.button('Sim, enviar a avaliação').click();
    });
    cy.wait('@avaliar').its('request.body').should((body) => {
      expect(body.nota).to.eq(4);
      expect(body.destaques).to.have.members(['PONTUALIDADE', 'ATRASO']);
    });
    cy.toast('Avaliação enviada. Obrigado por contar como foi.').should('be.visible');
    card().should('not.exist');
  });

  it('exige a nota antes de enviar', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes([avaliacaoPendente()]));
    cy.visitAs('/patient', sessaoPaciente());
    card().contains('button', 'Avaliar').click();
    cy.dialog('Avaliar atendimento').within(() => {
      cy.button('Sim, enviar a avaliação').click();
      cy.contains('Escolha de 1 a 5 estrelas.').should('be.visible');
    });
  });

  it('avaliar depois fecha sem enviar', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes([avaliacaoPendente()]));
    cy.visitAs('/patient', sessaoPaciente());
    card().contains('button', 'Avaliar').click();
    cy.dialog('Avaliar atendimento').within(() => cy.button('Não, avaliar depois').click());
    cy.get('[role="dialog"]').should('not.exist');
    card().should('exist');
  });

  it('atendimento com problema relatado não pode ser avaliado', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes([avaliacaoPendente()]));
    apiError('POST', '/avaliacoes/atendimentos/500', 'Este atendimento tem um problema relatado. A avaliação volta a ficar disponível quando ele for resolvido.');
    cy.visitAs('/patient', sessaoPaciente());
    card().contains('button', 'Avaliar').click();
    cy.dialog('Avaliar atendimento').within(() => {
      cy.get('[role="radio"]').eq(4).click();
      cy.button('Sim, enviar a avaliação').click();
    });
    cy.toast('Este atendimento tem um problema relatado.').should('be.visible');
  });

  it('profissional avalia o paciente', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes([avaliacaoPendente({ nomeAvaliado: 'Ana Paciente' })]));
    api('POST', '/avaliacoes/atendimentos/500', avaliacoesPendentes()).as('avaliar');
    cy.visitAs('/professional', sessaoProfissional());
    card().should('contain', 'Conte como foi com o paciente.');
    card().contains('button', 'Avaliar').click();
    cy.dialog('Avaliar atendimento').within(() => {
      cy.get('[role="radio"]').eq(4).click();
      cy.button('Sim, enviar a avaliação').click();
    });
    cy.wait('@avaliar').its('request.body.nota').should('eq', 5);
  });

  it('ao criar solicitação pergunta se quer avaliar antes', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes([avaliacaoPendente(), avaliacaoPendente({ atendimentoId: 501 })]));
    cy.visitAs('/patient/novo', sessaoPaciente());
    cy.dialog('Atendimentos para avaliar').within(() => {
      cy.contains('Você tem 2 atendimentos para avaliar.').should('be.visible');
      cy.button('Sim, avaliar agora').click();
    });
    cy.dialog('Avaliar atendimento').should('be.visible');
  });

  it('avaliar depois não pergunta de novo na mesma sessão', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes([avaliacaoPendente()]));
    api('GET', '/solicitacoes/100', solicitacao());
    cy.visitAs('/patient/novo', sessaoPaciente());
    cy.dialog('Atendimentos para avaliar').within(() => cy.button('Não, avaliar depois').click());
    cy.get('.ui-app-header').contains('Minhas solicitações').click();
    cy.button('Nova solicitação').click();
    cy.contains('h1', 'Nova solicitação').should('be.visible');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('ao enviar proposta pergunta se quer avaliar antes', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes([avaliacaoPendente({ nomeAvaliado: 'Ana Paciente' })]));
    api('GET', '/solicitacoes/100', solicitacao());
    api('GET', '/solicitacoes/100/propostas', []);
    cy.visitAs('/professional/solicitacoes/100', sessaoProfissional());
    cy.dialog('Atendimentos para avaliar').should('contain', 'Você tem 1 atendimento para avaliar.');
  });

  it('pagina quando há mais de 5 pendências', () => {
    api('GET', '/avaliacoes/pendentes', avaliacoesPendentes(Array.from({ length: 7 }, (_, index) => avaliacaoPendente({ atendimentoId: 500 + index }))));
    cy.visitAs('/patient', sessaoPaciente());
    card().find('.pending-ratings-card__item').should('have.length', 5);
    card().find('[aria-label="Próxima página"]').click();
    card().find('.pending-ratings-card__item').should('have.length', 2);
  });
});
