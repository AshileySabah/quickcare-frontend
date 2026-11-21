import { api, apiError, route } from '../../support/api';
import {
  atendimento,
  perfilPublicoProfissional,
  profissionalSolicitado,
  proposta,
  sessaoPaciente,
  solicitacao,
} from '../../support/factories';

function abrirDetalhe(propostas: unknown[], sol = solicitacao({ totalPropostas: propostas.length })) {
  api('GET', '/solicitacoes/100', sol);
  api('GET', '/solicitacoes/100/propostas', propostas);
  cy.visitAs('/patient/solicitacoes/100', sessaoPaciente());
}

describe('Paciente · Propostas recebidas', () => {
  it('mostra a proposta com profissional, atuação, valor, abordagem e período', () => {
    abrirDetalhe([proposta()]);
    cy.get('ui-proposal-card').within(() => {
      cy.contains('Bruno Enfermeiro').should('be.visible');
      cy.contains('Enfermeiro(a) — Curativos').should('be.visible');
      cy.contains('R$ 150,00').should('be.visible');
      cy.contains('Faço o curativo com material estéril').should('be.visible');
      cy.contains('Quando:').should('be.visible');
      cy.contains('Pendente').should('be.visible');
    });
  });

  it('aceita a proposta pelo modal de confirmação', () => {
    api('PATCH', '/propostas/200/aceitar', proposta({ status: 'ACEITA', atendimento: atendimento() })).as('aceitar');
    abrirDetalhe([proposta()]);
    cy.button('Aceitar proposta').click();
    cy.dialog('Aceitar proposta').within(() => {
      cy.contains('Aceitar a proposta de Bruno Enfermeiro?').should('be.visible');
      cy.contains('O profissional ocupa uma das vagas pedidas').should('be.visible');
      cy.button('Sim, aceitar a proposta').click();
    });
    cy.wait('@aceitar');
    cy.toast('Proposta aceita!').should('be.visible');
  });

  it('desistir de aceitar fecha o modal sem chamar a API', () => {
    cy.intercept(route('PATCH', '/propostas/200/aceitar'), cy.spy().as('aceitar'));
    abrirDetalhe([proposta()]);
    cy.button('Aceitar proposta').click();
    cy.dialog('Aceitar proposta').within(() => cy.button('Não, ainda não').click());
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('@aceitar').should('not.have.been.called');
  });

  it('vaga já preenchida faz o aceite falhar com aviso', () => {
    apiError('PATCH', '/propostas/200/aceitar', 'Esta proposta não está mais disponível para aceite.');
    abrirDetalhe([proposta()]);
    cy.button('Aceitar proposta').click();
    cy.dialog('Aceitar proposta').within(() => cy.button('Sim, aceitar a proposta').click());
    cy.toast('Esta proposta não está mais disponível para aceite.').should('be.visible');
  });

  it('recusa a proposta com confirmação', () => {
    api('PATCH', '/propostas/200/recusar', proposta({ status: 'RECUSADA' })).as('recusar');
    abrirDetalhe([proposta()]);
    cy.button('Recusar').click();
    cy.dialog('Recusar proposta').within(() => {
      cy.contains('Enquanto a solicitação receber propostas, ele pode enviar uma nova.').should('be.visible');
      cy.button('Sim, recusar a proposta').click();
    });
    cy.wait('@recusar');
    cy.toast('Proposta recusada.').should('be.visible');
  });

  it('proposta recusada ou cancelada não tem ações', () => {
    abrirDetalhe([proposta({ status: 'RECUSADA' }), proposta({ id: 201, status: 'CANCELADA' })]);
    cy.button('Aceitar proposta').should('not.exist');
    cy.contains('Recusada').should('be.visible');
  });

  it('solicitação que não recebe mais propostas não mostra aceitar/recusar', () => {
    abrirDetalhe([proposta()], solicitacao({ status: 'CANCELADA' }));
    cy.button('Aceitar proposta').should('not.exist');
  });

  it('proposta alterada pelo profissional pede novo aceite', () => {
    abrirDetalhe([proposta({ motivoReaceite: 'PROPOSTA_ALTERADA' })]);
    cy.contains('O profissional alterou esta proposta depois do seu aceite. Aceite de novo para confirmar.').should('be.visible');
  });

  it('com proposta aceita mostra o atendimento e o botão Conversar', () => {
    abrirDetalhe(
      [proposta({ status: 'ACEITA', atendimento: atendimento() })],
      solicitacao({ status: 'EM_ANDAMENTO', profissionais: [profissionalSolicitado({ vagasPreenchidas: 1 })] }),
    );
    cy.get('section[aria-label="Atendimento"]').should('contain', 'Agendado');
    cy.button('Conversar').click();
    cy.location('pathname').should('eq', '/patient/mensagens/100');
  });

  it('profissional bloqueado aparece como "Perfil não disponível"', () => {
    abrirDetalhe([proposta({ profissional: { perfilIndisponivel: true, nome: null } })]);
    cy.contains('Perfil não disponível').should('be.visible');
    cy.get('[aria-label^="Opções para"]').should('not.exist');
  });

  it('menu da pessoa leva ao perfil do profissional', () => {
    api('GET', '/profissionais/2/perfil', perfilPublicoProfissional());
    abrirDetalhe([proposta()]);
    cy.get('[aria-label="Opções para Bruno Enfermeiro"]').click();
    cy.contains('[role="menuitem"]', 'Ver perfil').click();
    cy.location('pathname').should('eq', '/patient/profissionais/2');
    cy.contains('h1', 'Bruno Enfermeiro').should('be.visible');
  });

  it('pagina as propostas de 5 em 5', () => {
    abrirDetalhe(Array.from({ length: 6 }, (_, index) => proposta({ id: 300 + index })));
    cy.get('ui-proposal-card').should('have.length', 5);
    cy.get('[aria-label="Página 2"]').click();
    cy.get('ui-proposal-card').should('have.length', 1);
  });
});
