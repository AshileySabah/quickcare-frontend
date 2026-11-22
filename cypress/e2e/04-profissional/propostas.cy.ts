import { api, apiError, route } from '../../support/api';
import {
  atendimento,
  atuacao,
  atuacaoMedico,
  banimento,
  bloqueio,
  localDateTime,
  perfilPublicoPaciente,
  profissionalSolicitado,
  proposta,
  resumoOcorrencias,
  sessaoProfissional,
  solicitacao,
  validacaoDetalhe,
} from '../../support/factories';

function preencherProposta() {
  cy.fillField('Preço (R$)', '180');
  cy.field('Início do atendimento').type(localDateTime(5, 9));
  cy.field('Término do atendimento').type(localDateTime(5, 11));
  cy.fillField('Abordagem', 'Faço o curativo com material estéril e oriento a família.');
}

function abrirSolicitacao(sol = solicitacao(), propostas: unknown[] = []) {
  api('GET', '/solicitacoes/100', sol);
  api('GET', '/solicitacoes/100/propostas', propostas);
  cy.visitAs('/professional/solicitacoes/100', sessaoProfissional());
}

describe('Profissional · Solicitações abertas', () => {
  it('sem solicitações compatíveis mostra o vazio', () => {
    cy.visitAs('/professional', sessaoProfissional());
    cy.contains('Nenhuma solicitação aberta').should('be.visible');
  });

  it('lista as solicitações disponíveis e abre o detalhe', () => {
    api('GET', '/solicitacoes/disponiveis', [solicitacao({ totalPropostas: 1 })]);
    api('GET', '/solicitacoes/100', solicitacao());
    api('GET', '/solicitacoes/100/propostas', []);
    cy.visitAs('/professional', sessaoProfissional());
    cy.contains('.professional-home__card-link', 'Preciso de curativo diário').within(() => {
      cy.contains('1× Curativos').should('be.visible');
      cy.contains('1 proposta').should('be.visible');
    });
    cy.contains('.professional-home__card-link', 'Preciso de curativo diário').click();
    cy.location('pathname').should('eq', '/professional/solicitacoes/100');
  });

  it('erro ao carregar permite tentar de novo', () => {
    api('GET', '/solicitacoes/disponiveis', { message: 'erro' }, 500);
    cy.visitAs('/professional', sessaoProfissional());
    cy.button('Tentar novamente').should('be.visible');
  });

  it('banido vê o aviso de banimento', () => {
    api('GET', '/banimentos', { banimento: banimento({ perfil: 'PROFISSIONAL' }) });
    cy.visitAs('/professional', sessaoProfissional('APROVADO', true));
    cy.contains('Perfil banido').should('be.visible');
    cy.contains('Nenhuma solicitação aberta').should('not.exist');
  });
});

describe('Profissional · Enviar proposta', () => {
  it('envia a proposta para a única vaga compatível', () => {
    api('POST', '/solicitacoes/100/propostas', proposta()).as('enviar');
    abrirSolicitacao();
    cy.contains('h2', 'Enviar proposta').should('be.visible');
    cy.contains('label', 'Vaga').should('not.exist');
    preencherProposta();
    cy.button('Enviar proposta').click();
    cy.wait('@enviar').its('request.body').should((body) => {
      expect(body.valor).to.eq(180);
      expect(body.atuacaoId).to.eq(10);
      expect(body.inicio).to.match(/Z$/);
    });
    cy.toast('Proposta enviada com sucesso!').should('be.visible');
  });

  it('com vagas para mais de uma atuação pede para escolher a vaga', () => {
    api('POST', '/solicitacoes/100/propostas', proposta()).as('enviar');
    abrirSolicitacao(solicitacao({ atuacoesParaProposta: [atuacao(), atuacaoMedico()] }));
    preencherProposta();
    cy.button('Enviar proposta').click();
    cy.contains('Escolha para qual vaga é a proposta.').should('be.visible');
    cy.selectField('Vaga', '11');
    cy.button('Enviar proposta').click();
    cy.wait('@enviar').its('request.body.atuacaoId').should('eq', 11);
  });

  it('valida preço, abordagem e período', () => {
    abrirSolicitacao();
    cy.fillField('Preço (R$)', '0');
    cy.fillField('Abordagem', 'curta');
    cy.field('Início do atendimento').type(localDateTime(-1, 9));
    cy.field('Término do atendimento').type(localDateTime(-2, 9));
    cy.button('Enviar proposta').click();
    cy.contains('Informe um valor válido.').should('be.visible');
    cy.contains('Descreva sua abordagem com mais detalhes (mínimo 20 caracteres).').should('be.visible');
    cy.contains('Escolha um início no futuro.').should('be.visible');
    cy.contains('O término precisa ser depois do início.').should('be.visible');
  });

  const recusas: [string, string][] = [
    ['solicitação que parou de receber propostas', 'Esta solicitação não está mais recebendo propostas.'],
    ['vaga sem espaço para a atuação', 'Esta solicitação não tem vaga aberta para a atuação escolhida.'],
    ['registro da atuação em validação', 'O seu registro da atuação desta vaga ainda está em validação.'],
    ['atendimento com mais de um ano', 'O atendimento pode durar no máximo um ano.'],
  ];
  recusas.forEach(([caso, mensagem]) => {
    it(`back-end recusa: ${caso}`, () => {
      apiError('POST', '/solicitacoes/100/propostas', mensagem);
      abrirSolicitacao();
      preencherProposta();
      cy.button('Enviar proposta').click();
      cy.toast(mensagem).should('be.visible');
    });
  });

  it('com bloqueio por ocorrências o envio fica desabilitado com aviso', () => {
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 3, bloqueio: bloqueio() }));
    abrirSolicitacao();
    cy.contains('Por excesso de ocorrências, você não pode enviar propostas').should('be.visible');
    cy.button('Enviar proposta').should('be.disabled');
  });

  it('em revalidação o envio fica desabilitado e aponta para Documentos', () => {
    api('GET', '/validacao/profissional', validacaoDetalhe('PROFISSIONAL', { emRevalidacao: true, bloqueiaCriacao: true }));
    abrirSolicitacao();
    cy.contains('Seus dados estão em revalidação.').should('be.visible');
    cy.button('Enviar proposta').should('be.disabled');
  });

  it('solicitação encerrada não recebe propostas', () => {
    abrirSolicitacao(solicitacao({ status: 'CANCELADA' }));
    cy.contains('Esta solicitação não está mais recebendo propostas.').should('be.visible');
  });

  it('solicitação inexistente mostra não encontrada', () => {
    api('GET', '/solicitacoes/999', { message: 'x' }, 404);
    cy.visitAs('/professional/solicitacoes/999', sessaoProfissional());
    cy.contains('Solicitação não encontrada').should('be.visible');
  });

  it('com proposta pendente o nome do paciente fica oculto', () => {
    abrirSolicitacao(solicitacao({ atuacoesParaProposta: [] }), [proposta()]);
    cy.contains('O nome e a foto do paciente aparecem aqui assim que ele aceitar a sua proposta.').should('be.visible');
    cy.contains('h2', 'Sua proposta').should('be.visible');
  });

  it('com proposta aceita mostra o paciente e permite conversar', () => {
    api('GET', '/pacientes/1/perfil', perfilPublicoPaciente());
    abrirSolicitacao(
      solicitacao({ status: 'EM_ANDAMENTO', atuacoesParaProposta: [], profissionais: [profissionalSolicitado({ vagasPreenchidas: 1 })] }),
      [proposta({ status: 'ACEITA', atendimento: atendimento(), solicitacao: { status: 'EM_ANDAMENTO' } })],
    );
    cy.get('[aria-label="Opções para Ana Paciente"]').should('be.visible');
    cy.button('Conversar').click();
    cy.location('pathname').should('eq', '/professional/mensagens/100');
  });

  it('reenvia a proposta depois de recusada, com valor e abordagem preenchidos', () => {
    api('POST', '/solicitacoes/100/propostas', proposta()).as('enviar');
    abrirSolicitacao(solicitacao(), [proposta({ status: 'RECUSADA' })]);
    cy.contains('h2', 'Reenviar proposta').should('be.visible');
    cy.contains('O paciente recusou a sua proposta anterior.').should('be.visible');
    cy.field('Preço (R$)').should('have.value', '150');
    cy.field('Início do atendimento').should('have.value', '');
    cy.field('Início do atendimento').type(localDateTime(6, 9));
    cy.field('Término do atendimento').type(localDateTime(6, 11));
    cy.button('Reenviar proposta').click();
    cy.wait('@enviar');
  });

  it('reenviar depois de cancelar explica que foi você quem cancelou', () => {
    abrirSolicitacao(solicitacao(), [proposta({ status: 'CANCELADA' })]);
    cy.contains('Você cancelou a sua proposta anterior.').should('be.visible');
  });
});

describe('Profissional · Minhas propostas', () => {
  it('vazio leva para as solicitações abertas', () => {
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.contains('Nenhuma proposta em andamento').should('be.visible');
    cy.button('Ver solicitações abertas').click();
    cy.location('pathname').should('eq', '/professional');
  });

  it('lista pendentes e aceitas; histórico lista recusadas e canceladas', () => {
    api('GET', '/propostas', [
      proposta({ id: 201 }),
      proposta({ id: 202, status: 'ACEITA', atendimento: atendimento(), solicitacao: { status: 'EM_ANDAMENTO' } }),
      proposta({ id: 203, status: 'RECUSADA' }),
      proposta({ id: 204, status: 'CANCELADA' }),
    ]);
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.get('ui-proposal-card').should('have.length', 2);
    cy.contains('O nome e a foto do paciente aparecem aqui assim que ele aceitar a sua proposta.').should('be.visible');
    cy.get('.ui-app-header').contains('Histórico').click();
    cy.contains('h1', 'Histórico').should('be.visible');
    cy.get('ui-proposal-card').should('have.length', 2);
  });

  it('cancela proposta pendente direto', () => {
    api('GET', '/propostas', [proposta()]);
    api('PATCH', '/propostas/200/cancelar', proposta({ status: 'CANCELADA' })).as('cancelar');
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.get('ui-proposal-card').contains('button', 'Cancelar').click();
    cy.wait('@cancelar');
    cy.toast('Proposta cancelada. Ela foi para o histórico.').should('be.visible');
    cy.contains('Nenhuma proposta em andamento').should('be.visible');
  });

  it('cancelar proposta aceita sem atendimento ativo pede confirmação', () => {
    api('GET', '/propostas', [proposta({ status: 'ACEITA', atendimento: atendimento({ status: 'CANCELADO' }), solicitacao: { status: 'EM_ANDAMENTO' } })]);
    api('PATCH', '/propostas/200/cancelar', proposta({ status: 'CANCELADA' })).as('cancelar');
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.get('ui-proposal-card').contains('button', /^\s*Cancelar\s*$/).click();
    cy.dialog('Cancelar proposta').within(() => {
      cy.contains('O atendimento é cancelado e a vaga reabre para outros profissionais.').should('be.visible');
      cy.button('Sim, cancelar a proposta').click();
    });
    cy.wait('@cancelar');
  });

  it('editar proposta pendente vai direto para o formulário', () => {
    api('GET', '/propostas', [proposta()]);
    api('GET', '/propostas/200', proposta());
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.get('ui-proposal-card').contains('button', 'Editar').click();
    cy.location('pathname').should('eq', '/professional/propostas/200/editar');
  });

  it('editar proposta aceita avisa que o paciente precisa aceitar de novo', () => {
    const aceita = proposta({ status: 'ACEITA', atendimento: atendimento(), solicitacao: { status: 'EM_ANDAMENTO' } });
    api('GET', '/propostas', [aceita]);
    api('GET', '/propostas/200', aceita);
    api('PUT', '/propostas/200', proposta({ motivoReaceite: 'PROPOSTA_ALTERADA' })).as('salvar');
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.get('ui-proposal-card').contains('button', 'Editar').click();
    cy.dialog('Editar proposta').within(() => {
      cy.contains('Ela deixa de estar aceita').should('be.visible');
      cy.button('Sim, editar a proposta').click();
    });
    cy.contains('Esta proposta já foi aceita.').should('be.visible');
    cy.fillField('Preço (R$)', '200');
    cy.button('Salvar alterações').click();
    cy.wait('@salvar').its('request.body.valor').should('eq', 200);
    cy.toast('Proposta atualizada. Ela aguarda um novo aceite do paciente.').should('be.visible');
    cy.location('pathname').should('eq', '/professional/propostas');
  });

  it('proposta que não pode mais ser editada volta para a lista', () => {
    api('GET', '/propostas/200', proposta({ status: 'RECUSADA' }));
    cy.visitAs('/professional/propostas/200/editar', sessaoProfissional());
    cy.toast('Esta proposta não pode mais ser editada.').should('be.visible');
    cy.location('pathname').should('eq', '/professional/propostas');
  });

  it('aviso de reaceite quando o paciente alterou a solicitação', () => {
    api('GET', '/propostas', [proposta({ motivoReaceite: 'SOLICITACAO_ALTERADA' })]);
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.contains('O paciente alterou a solicitação depois de aceitar sua proposta.').should('be.visible');
  });

  it('histórico permite reenviar a última proposta recusada', () => {
    api('GET', '/propostas', [proposta({ status: 'RECUSADA' })]);
    api('GET', '/solicitacoes/100', solicitacao());
    api('GET', '/solicitacoes/100/propostas', [proposta({ status: 'RECUSADA' })]);
    cy.visitAs('/professional/historico', sessaoProfissional());
    cy.button('Reenviar proposta').click();
    cy.location('pathname').should('eq', '/professional/solicitacoes/100');
  });

  it('com bloqueio o reenviar fica desabilitado', () => {
    api('GET', '/propostas', [proposta({ status: 'RECUSADA' })]);
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 3, bloqueio: bloqueio() }));
    cy.visitAs('/professional/historico', sessaoProfissional());
    cy.button('Reenviar proposta').should('be.disabled');
  });

  it('paciente que bloqueou aparece como "Perfil não disponível"', () => {
    api('GET', '/propostas', [proposta({ status: 'ACEITA', solicitacao: { pacienteIndisponivel: true, pacienteNome: undefined, status: 'EM_ANDAMENTO' } })]);
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.contains('Perfil não disponível').should('be.visible');
  });

  it('filtra por status', () => {
    api('GET', '/propostas', [proposta({ id: 201 }), proposta({ id: 202, status: 'ACEITA', solicitacao: { status: 'EM_ANDAMENTO' } })]);
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.get('ui-proposal-card').should('have.length', 2);
    cy.field('Status').find('option').its('length').should('be.gte', 2);
  });

  it('erro ao cancelar mostra o motivo', () => {
    api('GET', '/propostas', [proposta()]);
    cy.intercept(route('PATCH', '/propostas/200/cancelar'), { statusCode: 409, body: { message: 'Esta proposta não pode mais ser cancelada.' } });
    cy.visitAs('/professional/propostas', sessaoProfissional());
    cy.get('ui-proposal-card').contains('button', 'Cancelar').click();
    cy.toast('Esta proposta não pode mais ser cancelada.').should('be.visible');
  });
});
