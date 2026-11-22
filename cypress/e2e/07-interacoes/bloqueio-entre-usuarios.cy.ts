import { api, apiError, route } from '../../support/api';
import {
  atendimento,
  perfilPublicoPaciente,
  perfilPublicoProfissional,
  previaBloqueio,
  profissionalSolicitado,
  proposta,
  sessaoPaciente,
  sessaoProfissional,
  solicitacao,
  usuarioBloqueado,
} from '../../support/factories';

function detalheComProposta(prop = proposta()) {
  api('GET', '/solicitacoes/100', solicitacao());
  api('GET', '/solicitacoes/100/propostas', [prop]);
  cy.visitAs('/patient/solicitacoes/100', sessaoPaciente());
  cy.get('[aria-label="Opções para Bruno Enfermeiro"]').click();
  cy.contains('[role="menuitem"]', 'Bloquear').click();
}

describe('Bloqueio · paciente bloqueia profissional', () => {
  it('pelo menu da proposta, mostrando a prévia do que será encerrado', () => {
    api('GET', '/bloqueios/profissionais/2/previa', previaBloqueio({ propostasPendentes: 2, propostasAceitas: 1 }));
    api('POST', '/bloqueios/profissionais/2', usuarioBloqueado()).as('bloquear');
    detalheComProposta();
    cy.dialog('Bloquear').within(() => {
      cy.contains('Bloquear Bruno Enfermeiro?').should('be.visible');
      cy.contains('O profissional deixa de ver as suas solicitações').should('be.visible');
      cy.contains('2 propostas pendentes desse profissional serão recusadas.').should('be.visible');
      cy.contains('1 proposta que você aceitou desse profissional passa para recusada').should('be.visible');
      cy.contains('O bloqueio não conta como ocorrência para você.').should('be.visible');
      cy.button('Sim, bloquear o profissional').click();
    });
    cy.wait('@bloquear').its('request.body').should('deep.equal', {});
    cy.toast('Pronto, você bloqueou Bruno Enfermeiro.').should('be.visible');
  });

  it('desistir mantém o profissional', () => {
    api('GET', '/bloqueios/profissionais/2/previa', previaBloqueio());
    cy.intercept(route('POST', '/bloqueios/profissionais/2'), cy.spy().as('bloquear'));
    detalheComProposta();
    cy.dialog('Bloquear').within(() => cy.button('Não, manter o profissional').click());
    cy.get('@bloquear').should('not.have.been.called');
  });

  it('a menos de 48h, com motivo, vai para análise do admin', () => {
    api('GET', '/bloqueios/profissionais/2/previa', previaBloqueio({ propostasAceitas: 1, bloqueioTardio: true }));
    api('POST', '/bloqueios/profissionais/2', usuarioBloqueado()).as('bloquear');
    detalheComProposta();
    cy.dialog('Bloquear').within(() => {
      cy.contains('Falta menos de 48h para um atendimento aceito').should('be.visible');
      cy.fillField('Motivo do bloqueio (opcional)', 'Recebi mensagens agressivas.');
      cy.button('Sim, bloquear o profissional').click();
    });
    cy.wait('@bloquear').its('request.body').should('deep.equal', { motivo: 'Recebi mensagens agressivas.' });
    cy.toast('O motivo foi enviado para análise do administrador.').should('be.visible');
  });

  it('a menos de 48h, sem motivo, a ocorrência é lançada na hora', () => {
    api('GET', '/bloqueios/profissionais/2/previa', previaBloqueio({ propostasAceitas: 1, bloqueioTardio: true }));
    api('POST', '/bloqueios/profissionais/2', usuarioBloqueado()).as('bloquear');
    detalheComProposta();
    cy.dialog('Bloquear').within(() => cy.button('Sim, bloquear o profissional').click());
    cy.wait('@bloquear');
    cy.toast('Como foi sem motivo, a ocorrência foi lançada.').should('be.visible');
  });

  it('falha na prévia fecha o modal com erro', () => {
    apiError('GET', '/bloqueios/profissionais/2/previa', 'Profissional não encontrado.', 404);
    detalheComProposta();
    cy.toast('Profissional não encontrado.').should('be.visible');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('bloquear quem já está bloqueado é recusado', () => {
    api('GET', '/bloqueios/profissionais/2/previa', previaBloqueio());
    apiError('POST', '/bloqueios/profissionais/2', 'Você já bloqueou esta pessoa.');
    detalheComProposta();
    cy.dialog('Bloquear').within(() => cy.button('Sim, bloquear o profissional').click());
    cy.toast('Você já bloqueou esta pessoa.').should('be.visible');
  });

  it('pelo perfil do profissional', () => {
    api('GET', '/profissionais/2/perfil', perfilPublicoProfissional());
    api('GET', '/bloqueios/profissionais/2/previa', previaBloqueio());
    api('POST', '/bloqueios/profissionais/2', usuarioBloqueado()).as('bloquear');
    cy.visitAs('/patient/profissionais/2', sessaoPaciente());
    cy.get('.profile-card__actions').contains('button', 'Bloquear').click();
    cy.dialog('Bloquear').within(() => cy.button('Sim, bloquear o profissional').click());
    cy.wait('@bloquear');
  });

  it('perfil de quem tem bloqueio dá não encontrado', () => {
    api('GET', '/profissionais/2/perfil', { message: 'Não encontrado' }, 404);
    cy.visitAs('/patient/profissionais/2', sessaoPaciente());
    cy.contains('Perfil não encontrado').should('be.visible');
  });
});

describe('Bloqueio · profissional bloqueia paciente', () => {
  it('pelo perfil do paciente, depois do aceite', () => {
    api('GET', '/pacientes/1/perfil', perfilPublicoPaciente());
    api('GET', '/bloqueios/pacientes/1/previa', previaBloqueio({ nome: 'Ana Paciente', propostasPendentes: 1 }));
    api('POST', '/bloqueios/pacientes/1', usuarioBloqueado({ nome: 'Ana Paciente' })).as('bloquear');
    cy.visitAs('/professional/pacientes/1', sessaoProfissional());
    cy.get('.profile-card__actions').contains('button', 'Bloquear').click();
    cy.dialog('Bloquear').within(() => {
      cy.contains('Você deixa de ver as solicitações desse paciente').should('be.visible');
      cy.contains('1 proposta pendente sua será cancelada.').should('be.visible');
      cy.button('Sim, bloquear o paciente').click();
    });
    cy.wait('@bloquear');
  });

  it('pelo menu do paciente em Minhas propostas', () => {
    api('GET', '/propostas', [proposta({ status: 'ACEITA', atendimento: atendimento(), solicitacao: { status: 'EM_ANDAMENTO' } })]);
    api('GET', '/bloqueios/pacientes/1/previa', previaBloqueio({ nome: 'Ana Paciente', propostasAceitas: 1 }));
    api('POST', '/bloqueios/pacientes/1', usuarioBloqueado({ nome: 'Ana Paciente' })).as('bloquear');
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.get('[aria-label="Opções para Ana Paciente"]').click();
    cy.contains('[role="menuitem"]', 'Bloquear').click();
    cy.dialog('Bloquear').within(() => cy.button('Sim, bloquear o paciente').click());
    cy.wait('@bloquear');
  });

  it('perfil do paciente sem aceite não fica disponível', () => {
    api('GET', '/pacientes/1/perfil', { message: 'x' }, 404);
    cy.visitAs('/professional/pacientes/1', sessaoProfissional());
    cy.contains('Perfil não disponível').should('be.visible');
  });

  it('perfil do paciente mostra saúde em curso e contatos depois do início', () => {
    api(
      'GET',
      '/pacientes/1/perfil',
      perfilPublicoPaciente({
        saude: { alergias: 'Dipirona', condicoesSaude: null, medicamentosEmUso: null },
        contatosEmergencia: [{ nome: 'Carlos Contato', telefone: '11912345678' }],
      }),
    );
    cy.visitAs('/professional/pacientes/1', sessaoProfissional());
    cy.field('Alergias').should('have.value', 'Dipirona');
    cy.field('Nome').should('have.value', 'Carlos Contato');
  });

  it('perfil do paciente sem atendimento em curso esconde a saúde', () => {
    api('GET', '/pacientes/1/perfil', perfilPublicoPaciente());
    cy.visitAs('/professional/pacientes/1', sessaoProfissional());
    cy.contains('Ficam visíveis só enquanto o atendimento estiver em curso.').should('be.visible');
  });
});

describe('Bloqueio · usuários bloqueados e desbloquear', () => {
  it('rota antiga de bloqueados redireciona para Segurança', () => {
    cy.visitAs('/patient/bloqueados', sessaoPaciente());
    cy.location('pathname').should('eq', '/patient/seguranca');
  });

  it('lista vazia explica como bloquear', () => {
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cy.contains('Você não bloqueou ninguém').should('be.visible');
    cy.contains('clique no nome dele numa proposta').should('be.visible');
  });

  it('desbloqueia com confirmação', () => {
    api('GET', '/bloqueios', [usuarioBloqueado()]);
    api('DELETE', '/bloqueios/60', {}).as('desbloquear');
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cy.contains('.blocked-users__item', 'Bruno Enfermeiro').contains('button', 'Desbloquear').click();
    cy.dialog('Desbloquear').within(() => {
      cy.contains('O que foi encerrado no bloqueio não volta.').should('be.visible');
      cy.button('Sim, desbloquear').click();
    });
    cy.wait('@desbloquear');
    cy.toast('Você desbloqueou Bruno Enfermeiro.').should('be.visible');
    cy.contains('Você não bloqueou ninguém').should('be.visible');
  });

  it('erro ao desbloquear mantém a pessoa na lista', () => {
    api('GET', '/bloqueios', [usuarioBloqueado()]);
    apiError('DELETE', '/bloqueios/60', 'Bloqueio não encontrado.', 404);
    cy.visitAs('/patient/seguranca', sessaoPaciente());
    cy.button('Desbloquear').click();
    cy.dialog('Desbloquear').within(() => cy.button('Sim, desbloquear').click());
    cy.toast('Bloqueio não encontrado.').should('be.visible');
    cy.contains('.blocked-users__item', 'Bruno Enfermeiro').should('exist');
  });

  it('profissional vê os pacientes que bloqueou', () => {
    api('GET', '/bloqueios', [usuarioBloqueado({ nome: 'Ana Paciente', perfilId: 1 })]);
    cy.visitAs('/professional/seguranca', sessaoProfissional());
    cy.contains('.blocked-users__item', 'Ana Paciente').should('be.visible');
  });

  it('solicitação com aceite mostra que o bloqueio encerrou o atendimento', () => {
    api('GET', '/solicitacoes/100', solicitacao({ status: 'RECEBENDO_PROPOSTAS', profissionais: [profissionalSolicitado()] }));
    api('GET', '/solicitacoes/100/propostas', [
      proposta({
        status: 'RECUSADA',
        profissional: { perfilIndisponivel: true, nome: null },
        atendimento: atendimento({ status: 'CANCELADO', canceladoPor: 'PACIENTE', motivoCancelamento: 'DESISTENCIA' }),
      }),
    ]);
    cy.visitAs('/patient/solicitacoes/100', sessaoPaciente());
    cy.contains('Perfil não disponível').should('be.visible');
    cy.contains('O paciente cancelou o atendimento.').should('be.visible');
  });
});
