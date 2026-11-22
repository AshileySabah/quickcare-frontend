import { api, apiError } from '../../support/api';
import {
  atendimento,
  inDays,
  inHours,
  localDateTime,
  profissionalSolicitado,
  proposta,
  sessaoPaciente,
  sessaoProfissional,
  solicitacao,
} from '../../support/factories';

const emAndamento = solicitacao({ status: 'EM_ANDAMENTO', profissionais: [profissionalSolicitado({ vagasPreenchidas: 1 })] });

function comoPaciente(at: ReturnType<typeof atendimento>) {
  api('GET', '/solicitacoes/100', emAndamento);
  api('GET', '/solicitacoes/100/propostas', [proposta({ status: 'ACEITA', atendimento: at })]);
  cy.visitAs('/patient/solicitacoes/100', sessaoPaciente());
}

function comoProfissional(at: ReturnType<typeof atendimento>, status = 'ACEITA') {
  api('GET', '/propostas', [proposta({ status, atendimento: at, solicitacao: { status: 'EM_ANDAMENTO' } })]);
  cy.visitAs('/professional/propostas', sessaoProfissional());
}

const painel = () => cy.get('section[aria-label="Atendimento"]');

describe('Atendimento · estados', () => {
  const casos: [string, string][] = [
    ['AGENDADO', 'Agendado'],
    ['EM_ANDAMENTO', 'Em andamento'],
    ['FINALIZADO', 'Finalizado'],
    ['CONCLUIDO', 'Concluído'],
    ['NAO_REALIZADO', 'Não realizado'],
    ['EM_DISPUTA', 'Em disputa'],
  ];
  casos.forEach(([status, rotulo]) => {
    it(`mostra o selo "${rotulo}"`, () => {
      comoPaciente(atendimento({ status }));
      painel().should('contain', rotulo);
    });
  });

  it('só agendado ou em andamento podem ser remarcados ou cancelados', () => {
    comoPaciente(atendimento({ status: 'FINALIZADO' }));
    painel().within(() => {
      cy.contains('button', 'Remarcar').should('not.exist');
      cy.contains('button', 'Cancelar atendimento').should('not.exist');
    });
  });

  it('cancelado mostra quem cancelou', () => {
    comoPaciente(atendimento({ status: 'CANCELADO', canceladoPor: 'PROFISSIONAL', motivoCancelamento: 'DESISTENCIA' }));
    painel().should('contain', 'O profissional cancelou o atendimento.');
  });

  const motivos: [string, string][] = [
    ['SOLICITACAO_CANCELADA', 'A solicitação foi cancelada.'],
    ['REACEITE_RECUSADO', 'O profissional recusou a nova versão da solicitação.'],
    ['SEM_REACEITE', 'O início chegou sem o profissional reaceitar'],
    ['SUBSTITUIDO', 'O paciente escolheu outro profissional para a vaga.'],
    ['EDICAO_INCOMPATIVEL', 'A nova versão da solicitação não tinha mais vaga'],
    ['ADMIN', 'Um administrador encerrou a solicitação.'],
  ];
  motivos.forEach(([motivo, texto]) => {
    it(`cancelado por ${motivo} explica o motivo`, () => {
      comoPaciente(atendimento({ status: 'CANCELADO', canceladoPor: 'SISTEMA', motivoCancelamento: motivo }));
      painel().should('contain', texto);
    });
  });
});

describe('Atendimento · cancelar', () => {
  it('paciente cancela dentro da tolerância de 48h sem ocorrência', () => {
    api('PATCH', '/atendimentos/500/cancelar', atendimento({ status: 'CANCELADO' })).as('cancelar');
    comoPaciente(atendimento());
    painel().contains('button', 'Cancelar atendimento').click();
    cy.dialog('Cancelar atendimento').within(() => {
      cy.contains('Ainda está dentro da tolerância de 48h do aceite: não conta como ocorrência.').should('be.visible');
      cy.button('Sim, cancelar o atendimento').click();
    });
    cy.wait('@cancelar');
    cy.toast('Atendimento cancelado.').should('be.visible');
  });

  it('cancelar depois de 48h do aceite avisa da ocorrência', () => {
    comoPaciente(atendimento({ cancelamentoContaOcorrencia: true }));
    painel().contains('button', 'Cancelar atendimento').click();
    cy.dialog('Cancelar atendimento').should('contain', 'Já passaram 48h do aceite, então isso conta como uma ocorrência para você.');
  });

  it('profissional cancela e o paciente é avisado', () => {
    api('PATCH', '/atendimentos/500/cancelar', atendimento({ status: 'CANCELADO' })).as('cancelar');
    comoProfissional(atendimento());
    painel().contains('button', 'Cancelar atendimento').click();
    cy.dialog('Cancelar atendimento').within(() => {
      cy.contains('O paciente é avisado.').should('be.visible');
      cy.button('Sim, cancelar o atendimento').click();
    });
    cy.wait('@cancelar');
  });

  it('desistir mantém o atendimento', () => {
    comoPaciente(atendimento());
    painel().contains('button', 'Cancelar atendimento').click();
    cy.dialog('Cancelar atendimento').within(() => cy.button('Não, manter o atendimento').click());
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('erro do back-end aparece', () => {
    apiError('PATCH', '/atendimentos/500/cancelar', 'Esta proposta não tem atendimento em curso para cancelar.');
    comoPaciente(atendimento());
    painel().contains('button', 'Cancelar atendimento').click();
    cy.dialog('Cancelar atendimento').within(() => cy.button('Sim, cancelar o atendimento').click());
    cy.toast('Esta proposta não tem atendimento em curso para cancelar.').should('be.visible');
  });
});

describe('Atendimento · remarcação', () => {
  it('paciente pede remarcação com novo período', () => {
    api('POST', '/atendimentos/500/remarcacao', atendimento()).as('remarcar');
    comoPaciente(atendimento());
    painel().contains('button', 'Remarcar').click();
    cy.dialog('Remarcar atendimento').within(() => {
      cy.field('Novo início').clear().type(localDateTime(7, 9));
      cy.field('Novo término').clear().type(localDateTime(7, 11));
      cy.button('Pedir remarcação').click();
    });
    cy.wait('@remarcar').its('request.body').should('have.keys', ['inicio', 'termino']);
    cy.toast('Pedido de remarcação enviado.').should('be.visible');
  });

  it('valida início no passado e término antes do início', () => {
    comoPaciente(atendimento());
    painel().contains('button', 'Remarcar').click();
    cy.dialog('Remarcar atendimento').within(() => {
      cy.field('Novo início').clear().type(localDateTime(-1, 9));
      cy.field('Novo término').clear().type(localDateTime(-2, 9));
      cy.button('Pedir remarcação').click();
      cy.contains('Escolha um início no futuro.').should('be.visible');
      cy.contains('O término precisa ser depois do início.').should('be.visible');
    });
  });

  it('em andamento só deixa mudar o término', () => {
    comoPaciente(atendimento({ status: 'EM_ANDAMENTO', inicio: inHours(-1), termino: inHours(1) }));
    painel().contains('button', 'Remarcar').click();
    cy.dialog('Remarcar atendimento').within(() => {
      cy.contains('O atendimento já começou: escolha o novo término.').should('be.visible');
      cy.field('Novo início').should('be.disabled');
    });
  });

  it('quem pediu vê que aguarda a resposta', () => {
    comoPaciente(atendimento({ remarcacao: { inicio: inDays(7), termino: inHours(7 * 24 + 2), solicitadaPor: 'PACIENTE', solicitadaEm: inHours(-1) } }));
    painel().should('contain', 'Você pediu para remarcar para').and('contain', 'Aguardando a resposta.');
    painel().contains('button', 'Aceitar remarcação').should('not.exist');
  });

  it('o outro lado aceita a remarcação', () => {
    api('PATCH', '/atendimentos/500/remarcacao/aceitar', atendimento()).as('aceitar');
    comoProfissional(atendimento({ remarcacao: { inicio: inDays(7), termino: inHours(7 * 24 + 2), solicitadaPor: 'PACIENTE', solicitadaEm: inHours(-1) } }));
    painel().should('contain', 'O paciente pediu para remarcar para');
    painel().contains('button', 'Aceitar remarcação').click();
    cy.wait('@aceitar');
    cy.toast('Remarcação aceita.').should('be.visible');
  });

  it('o outro lado recusa e mantém o horário', () => {
    api('PATCH', '/atendimentos/500/remarcacao/recusar', atendimento()).as('recusar');
    comoPaciente(atendimento({ remarcacao: { inicio: inDays(7), termino: inHours(7 * 24 + 2), solicitadaPor: 'PROFISSIONAL', solicitadaEm: inHours(-1) } }));
    painel().should('contain', 'Bruno Enfermeiro pediu para remarcar para');
    painel().contains('button', 'Recusar remarcação').click();
    cy.wait('@recusar');
    cy.toast('Remarcação recusada.').should('be.visible');
  });
});

describe('Atendimento · reaceite depois da edição da solicitação', () => {
  it('profissional vê o aviso e reaceita', () => {
    api('PATCH', '/atendimentos/500/reaceitar', atendimento()).as('reaceitar');
    comoProfissional(atendimento({ status: 'AGUARDANDO_REACEITE' }), 'PENDENTE');
    painel().should('contain', 'O paciente alterou a solicitação depois de aceitar a sua proposta.');
    painel().contains('button', 'Reaceitar').click();
    cy.wait('@reaceitar');
    cy.toast('Você reaceitou a nova versão.').should('be.visible');
  });

  it('profissional recusa a nova versão sem penalidade', () => {
    api('PATCH', '/atendimentos/500/recusar-reaceite', atendimento({ status: 'CANCELADO' })).as('recusar');
    comoProfissional(atendimento({ status: 'AGUARDANDO_REACEITE' }), 'PENDENTE');
    painel().contains('button', 'Recusar nova versão').click();
    cy.dialog('Recusar nova versão').within(() => {
      cy.contains('Recusar a nova versão não conta como ocorrência para você.').should('be.visible');
      cy.button('Sim, recusar a nova versão').click();
    });
    cy.wait('@recusar');
    cy.toast('Nova versão recusada.').should('be.visible');
  });

  it('paciente vê que aguarda o reaceite e pode aceitar outra', () => {
    comoPaciente(atendimento({ status: 'AGUARDANDO_REACEITE' }));
    painel().should('contain', 'Aguardando Bruno Enfermeiro reaceitar a nova versão da solicitação.');
    painel().contains('button', 'Reaceitar').should('not.exist');
  });

  it('paciente com edição a menos de 48h é avisado da ocorrência', () => {
    comoPaciente(atendimento({ status: 'AGUARDANDO_REACEITE', alteracaoTardia: true }));
    painel().should('contain', 'trocar de profissional conta como ocorrência para você');
  });
});
