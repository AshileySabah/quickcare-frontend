import { api, apiError, route } from '../../support/api';
import {
  PACIENTE,
  PROFISSIONAL,
  bloqueioUsuarioAdmin,
  perfilAdminDetalhe,
  perfilAdminResumo,
  propostaAdmin,
  sessaoAdmin,
  solicitacaoAdminDetalhe,
  solicitacaoAdminResumo,
} from '../../support/factories';

const chips = (grupo: string) => cy.get(`[role="group"][aria-label="${grupo}"]`);

function justificar(titulo: string, confirmar: string, texto = 'Justificativa do admin.') {
  cy.dialog(titulo).within(() => {
    cy.fillField('Justificativa', texto);
    cy.button(confirmar).click();
  });
}

describe('Admin · Gerais · usuários', () => {
  it('/admin/gerais abre Usuários e busca qualquer pessoa', () => {
    cy.intercept(route('GET', '/admin/perfis'), [perfilAdminResumo()]).as('lista');
    api('GET', '/admin/perfis/PACIENTE/1', perfilAdminDetalhe());
    cy.visitAs('/admin/gerais', sessaoAdmin());
    cy.location('pathname').should('eq', '/admin/gerais/usuarios');
    cy.wait('@lista').its('request.query.situacao').should('eq', 'TODOS');
    cy.fillField('Buscar', 'ana');
    cy.wait('@lista').its('request.query.busca').should('eq', 'ana');
    cy.contains('.admin-profiles__card-link', 'Ana Paciente').click();
    cy.location('pathname').should('eq', '/admin/perfis/patient/1');
  });

  it('sub-menu leva às outras listas', () => {
    cy.visitAs('/admin/gerais/usuarios', sessaoAdmin());
    cy.contains('a', 'Propostas').click();
    cy.location('pathname').should('eq', '/admin/gerais/propostas');
    cy.contains('a', 'Bloqueios entre usuários').click();
    cy.location('pathname').should('eq', '/admin/gerais/bloqueios-entre-usuarios');
  });
});

describe('Admin · Gerais · solicitações', () => {
  it('lista, filtra por status e busca', () => {
    cy.intercept(route('GET', '/admin/solicitacoes'), [solicitacaoAdminResumo()]).as('lista');
    cy.visitAs('/admin/gerais/solicitacoes', sessaoAdmin());
    cy.wait('@lista');
    cy.contains('.admin-requests__card-link', '#100').should('contain', 'Ana Paciente').and('contain', '0 de 1 vagas preenchidas');
    cy.fillField('Buscar', '100');
    cy.wait('@lista').its('request.query.busca').should('eq', '100');
  });

  it('rota antiga de solicitações redireciona', () => {
    cy.visitAs('/admin/solicitacoes', sessaoAdmin());
    cy.location('pathname').should('eq', '/admin/gerais/solicitacoes');
  });

  it('detalhe mostra propostas e atendimentos e cancela a solicitação', () => {
    api('GET', '/admin/solicitacoes/100', solicitacaoAdminDetalhe());
    api('PATCH', '/admin/solicitacoes/100/status', solicitacaoAdminDetalhe({ resumo: solicitacaoAdminResumo({ status: 'CANCELADA' }), acoesPermitidas: ['REABRIR'] })).as('status');
    cy.visitAs('/admin/solicitacoes/100', sessaoAdmin());
    cy.contains('h1', '#100 · Enfermeiro(a) · Curativos').should('be.visible');
    cy.contains('.request-detail__proposal', 'Bruno Enfermeiro').invoke('text').should('match', /R\$\s?150,00/);
    cy.get('.request-detail__actions').contains('button', 'Cancelar').click();
    justificar('Mudar o status', 'Sim, cancelar a solicitação');
    cy.wait('@status').its('request.body').should('deep.equal', { acao: 'CANCELAR', justificativa: 'Justificativa do admin.' });
    cy.get('.request-detail__actions').contains('button', 'Reabrir').should('be.visible');
  });

  it('conclui e reabre a solicitação', () => {
    api('GET', '/admin/solicitacoes/100', solicitacaoAdminDetalhe());
    cy.intercept(route('PATCH', '/admin/solicitacoes/100/status'), solicitacaoAdminDetalhe({ acoesPermitidas: ['REABRIR'] })).as('status');
    cy.visitAs('/admin/solicitacoes/100', sessaoAdmin());
    cy.get('.request-detail__actions').contains('button', 'Concluir').click();
    justificar('Mudar o status', 'Sim, concluir a solicitação');
    cy.wait('@status').its('request.body.acao').should('eq', 'CONCLUIR');
    cy.get('.request-detail__actions').contains('button', 'Reabrir').click();
    justificar('Mudar o status', 'Sim, reabrir a solicitação');
    cy.wait('@status').its('request.body.acao').should('eq', 'REABRIR');
  });

  it('transição inválida é recusada', () => {
    api('GET', '/admin/solicitacoes/100', solicitacaoAdminDetalhe());
    apiError('PATCH', '/admin/solicitacoes/100/status', 'Não é possível deixar a solicitação concluída.');
    cy.visitAs('/admin/solicitacoes/100', sessaoAdmin());
    cy.get('.request-detail__actions').contains('button', 'Concluir').click();
    justificar('Mudar o status', 'Sim, concluir a solicitação');
    cy.toast('Não é possível deixar a solicitação concluída.').should('be.visible');
  });

  it('solicitação inexistente', () => {
    api('GET', '/admin/solicitacoes/999', { message: 'x' }, 404);
    cy.visitAs('/admin/solicitacoes/999', sessaoAdmin());
    cy.contains('Solicitação não encontrada').should('be.visible');
  });
});

describe('Admin · Gerais · propostas', () => {
  it('recusa proposta pendente', () => {
    api('GET', '/admin/propostas', [propostaAdmin()]);
    api('PATCH', '/admin/propostas/200/status', propostaAdmin({ status: 'RECUSADA', acoesPermitidas: ['REATIVAR'] })).as('status');
    cy.visitAs('/admin/gerais/propostas', sessaoAdmin());
    cy.contains('Bruno Enfermeiro → Ana Paciente').should('be.visible');
    cy.contains('button', 'Recusar').click();
    justificar('Recusar proposta', 'Sim, recusar a proposta');
    cy.wait('@status').its('request.body.acao').should('eq', 'RECUSAR');
    cy.contains('button', 'Reativar').should('be.visible');
  });

  it('cancela proposta aceita sem ocorrência', () => {
    api('GET', '/admin/propostas', [propostaAdmin({ status: 'ACEITA', statusAtendimento: 'AGENDADO', acoesPermitidas: ['CANCELAR'] })]);
    api('PATCH', '/admin/propostas/200/status', propostaAdmin({ status: 'CANCELADA', acoesPermitidas: [] })).as('status');
    cy.visitAs('/admin/gerais/propostas', sessaoAdmin());
    cy.contains('atendimento agendado').should('be.visible');
    cy.contains('.admin-proposals__actions button', 'Cancelar').click();
    justificar('Cancelar proposta', 'Sim, cancelar a proposta');
    cy.wait('@status').its('request.body.acao').should('eq', 'CANCELAR');
  });

  it('reativar com bloqueio entre os dois é recusado', () => {
    api('GET', '/admin/propostas', [propostaAdmin({ status: 'RECUSADA', acoesPermitidas: ['REATIVAR'] })]);
    apiError('PATCH', '/admin/propostas/200/status', 'O paciente e o profissional estão bloqueados entre si. Remova o bloqueio antes de reativar.');
    cy.visitAs('/admin/gerais/propostas', sessaoAdmin());
    cy.contains('button', 'Reativar').click();
    justificar('Reativar proposta', 'Sim, reativar a proposta');
    cy.toast('estão bloqueados entre si').should('be.visible');
  });

  it('filtra por status', () => {
    cy.intercept(route('GET', '/admin/propostas'), []).as('lista');
    cy.visitAs('/admin/gerais/propostas', sessaoAdmin());
    cy.wait('@lista');
    chips('Filtrar por status').find('button').eq(1).click();
    cy.wait('@lista').its('request.query').should('have.property', 'status');
    cy.contains('Nenhuma proposta encontrada').should('be.visible');
  });
});

describe('Admin · Gerais · bloqueios entre usuários', () => {
  it('lista os bloqueios com o autor', () => {
    api('GET', '/admin/bloqueios-usuario', [bloqueioUsuarioAdmin(), bloqueioUsuarioAdmin({ id: 71, bloqueadoPor: 'PACIENTE', criadoPor: undefined, justificativa: undefined })]);
    cy.visitAs('/admin/gerais/bloqueios-entre-usuarios', sessaoAdmin());
    cy.contains('Bloqueado pelo administrador').should('be.visible');
    cy.contains('Bloqueado pelo paciente').should('be.visible');
  });

  it('bloqueia um paciente e um profissional entre si', () => {
    cy.intercept(route('GET', '/admin/perfis'), (req) => {
      req.reply(
        req.query['perfil'] === 'PACIENTE'
          ? [perfilAdminResumo()]
          : [perfilAdminResumo({ usuarioId: PROFISSIONAL.usuarioId, perfil: 'PROFISSIONAL', nome: PROFISSIONAL.nome, email: PROFISSIONAL.email })],
      );
    });
    api('POST', '/admin/bloqueios-usuario', bloqueioUsuarioAdmin()).as('bloquear');
    cy.visitAs('/admin/gerais/bloqueios-entre-usuarios', sessaoAdmin());
    cy.button('Bloquear usuários').click();
    cy.dialog('Bloquear usuários entre si').within(() => {
      cy.fillField('Justificativa', 'Conflito recorrente entre os dois.');
      cy.button('Sim, bloquear os dois').click();
      cy.contains('Escolha o paciente.').should('be.visible');
      cy.contains('Escolha o profissional.').should('be.visible');
      cy.fillField('Paciente', 'ana');
      cy.contains('[role="option"]', PACIENTE.nome).click();
      cy.fillField('Profissional', 'bruno');
      cy.contains('[role="option"]', PROFISSIONAL.nome).click();
      cy.fillField('Justificativa', 'Conflito recorrente entre os dois.');
      cy.button('Sim, bloquear os dois').click();
    });
    cy.wait('@bloquear').its('request.body').should('deep.equal', {
      pacienteUsuarioId: 1,
      profissionalUsuarioId: 2,
      justificativa: 'Conflito recorrente entre os dois.',
    });
  });

  it('remove o bloqueio', () => {
    api('GET', '/admin/bloqueios-usuario', [bloqueioUsuarioAdmin()]);
    api('PATCH', '/admin/bloqueios-usuario/70/remover', {}).as('remover');
    cy.visitAs('/admin/gerais/bloqueios-entre-usuarios', sessaoAdmin());
    cy.button('Remover bloqueio').click();
    cy.dialog('Remover bloqueio').within(() => {
      cy.contains('Remover o bloqueio entre Ana Paciente e Bruno Enfermeiro?').should('be.visible');
      cy.fillField('Justificativa', 'Resolvido.');
      cy.button('Sim, remover o bloqueio').click();
    });
    cy.wait('@remover');
  });

  it('bloqueio repetido é recusado', () => {
    cy.intercept(route('GET', '/admin/perfis'), (req) =>
      req.reply(
        req.query['perfil'] === 'PACIENTE'
          ? [perfilAdminResumo()]
          : [perfilAdminResumo({ usuarioId: PROFISSIONAL.usuarioId, perfil: 'PROFISSIONAL', nome: PROFISSIONAL.nome, email: PROFISSIONAL.email })],
      ),
    );
    apiError('POST', '/admin/bloqueios-usuario', 'Estes dois já estão bloqueados pelo administrador.');
    cy.visitAs('/admin/gerais/bloqueios-entre-usuarios', sessaoAdmin());
    cy.button('Bloquear usuários').click();
    cy.dialog('Bloquear usuários entre si').within(() => {
      cy.fillField('Paciente', 'ana');
      cy.contains('[role="option"]', PACIENTE.nome).click();
      cy.fillField('Profissional', 'bruno');
      cy.contains('[role="option"]', PROFISSIONAL.nome).click();
      cy.fillField('Justificativa', 'x');
      cy.button('Sim, bloquear os dois').click();
    });
    cy.toast('Estes dois já estão bloqueados pelo administrador.').should('be.visible');
  });
});
