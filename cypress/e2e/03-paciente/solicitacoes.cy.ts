import { api, apiError, apiSequence, route } from '../../support/api';
import {
  ENDERECO,
  banimento,
  bloqueio,
  dateOnly,
  inHours,
  profissionalSolicitado,
  resumoOcorrencias,
  sessaoPaciente,
  solicitacao,
  validacaoDetalhe,
} from '../../support/factories';

function preencherNovaSolicitacao() {
  cy.selectField('Categoria', 'ENFERMEIRO');
  cy.multiSelect('Especialidades', ['Curativos']);
  cy.fillField('Quantidade', '1');
  cy.fillField('Descreva sua necessidade', 'Preciso de curativo diário após cirurgia no joelho.');
  cy.field('Prazo desejado').type(dateOnly(10));
}

describe('Paciente · Minhas solicitações', () => {
  it('sem solicitações mostra o estado vazio e o botão de nova solicitação', () => {
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('Nenhuma solicitação ativa').should('be.visible');
    cy.button('Nova solicitação').click();
    cy.location('pathname').should('eq', '/patient/novo');
  });

  it('lista só as solicitações ativas, com modalidade, status e propostas', () => {
    api('GET', '/solicitacoes', [
      solicitacao({ id: 101, totalPropostas: 2 }),
      solicitacao({ id: 102, status: 'EM_ANDAMENTO', modalidade: 'PRESENCIAL', endereco: ENDERECO }),
      solicitacao({ id: 103, status: 'CONCLUIDA' }),
      solicitacao({ id: 104, status: 'CANCELADA' }),
    ]);
    cy.visitAs('/patient', sessaoPaciente());
    cy.get('app-request-card').should('have.length', 2);
    cy.contains('app-request-card', '#101').within(() => {
      cy.contains('Online').should('be.visible');
      cy.contains('Recebendo propostas').should('be.visible');
      cy.contains('profissionais responderam').should('be.visible');
    });
    cy.contains('app-request-card', '#102').within(() => {
      cy.contains('Presencial').should('be.visible');
      cy.contains('Avenida Paulista, 1000').should('be.visible');
    });
    cy.contains('#103').should('not.exist');
  });

  it('filtra e busca na lista', () => {
    api('GET', '/solicitacoes', [
      solicitacao({ id: 101, descricao: 'Curativo no joelho depois da cirurgia de menisco.' }),
      solicitacao({ id: 102, descricao: 'Acompanhamento de idoso durante a noite toda.', modalidade: 'PRESENCIAL', endereco: ENDERECO }),
    ]);
    cy.visitAs('/patient', sessaoPaciente());
    cy.fillField('Buscar', 'idoso');
    cy.get('app-request-card').should('have.length', 1).and('contain', '#102');
    cy.button('Limpar filtros').first().click();
    cy.get('app-request-card').should('have.length', 2);
    cy.selectField('Modalidade', 'online');
    cy.get('app-request-card').should('have.length', 1).and('contain', '#101');
  });

  it('busca sem resultado mostra o vazio dos filtros', () => {
    api('GET', '/solicitacoes', [solicitacao()]);
    cy.visitAs('/patient', sessaoPaciente());
    cy.fillField('Buscar', 'nada parecido');
    cy.contains('Nenhuma solicitação encontrada').should('be.visible');
  });

  it('erro ao carregar permite tentar de novo', () => {
    apiSequence('GET', '/solicitacoes', [{ statusCode: 500, body: { message: 'Erro' } }, { body: [solicitacao()] }]);
    cy.visitAs('/patient', sessaoPaciente());
    cy.button('Tentar novamente').click();
    cy.get('app-request-card').should('have.length', 1);
  });

  it('cancela solicitação sem aceite direto, sem modal', () => {
    api('GET', '/solicitacoes', [solicitacao()]);
    api('PATCH', '/solicitacoes/100/cancelar', solicitacao({ status: 'CANCELADA' })).as('cancelar');
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('app-request-card', '#100').contains('button', 'Cancelar').click();
    cy.wait('@cancelar');
    cy.get('[role="dialog"]').should('not.exist');
    cy.toast('Solicitação cancelada. Ela agora aparece no histórico.').should('be.visible');
    cy.contains('Nenhuma solicitação ativa').should('be.visible');
  });

  it('cancelar solicitação com aceite pede confirmação com as consequências', () => {
    const comAceite = solicitacao({ status: 'EM_ANDAMENTO', profissionais: [profissionalSolicitado({ vagasPreenchidas: 1 })] });
    api('GET', '/solicitacoes', [comAceite]);
    api('PATCH', '/solicitacoes/100/cancelar', { ...comAceite, status: 'CANCELADA' }).as('cancelar');
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('app-request-card', '#100').contains('button', 'Cancelar').click();
    cy.dialog('Cancelar solicitação').within(() => {
      cy.contains('Os atendimentos marcados são cancelados e os profissionais são avisados.').should('be.visible');
      cy.button('Não, manter a solicitação').click();
    });
    cy.get('[role="dialog"]').should('not.exist');
    cy.contains('app-request-card', '#100').contains('button', 'Cancelar').click();
    cy.dialog('Cancelar solicitação').within(() => cy.button('Sim, cancelar a solicitação').click());
    cy.wait('@cancelar');
    cy.toast('Solicitação cancelada').should('be.visible');
  });

  it('erro ao cancelar mostra o motivo', () => {
    api('GET', '/solicitacoes', [solicitacao()]);
    apiError('PATCH', '/solicitacoes/100/cancelar', 'Esta solicitação não pode mais ser cancelada.');
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('app-request-card', '#100').contains('button', 'Cancelar').click();
    cy.toast('Esta solicitação não pode mais ser cancelada.').should('be.visible');
  });

  it('com atendimento em andamento não mostra o botão Editar', () => {
    api('GET', '/solicitacoes', [solicitacao({ status: 'EM_ANDAMENTO', atendimentoEmAndamento: true })]);
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('app-request-card', '#100').within(() => cy.contains('button', 'Editar').should('not.exist'));
  });

  it('editar sem aceite vai direto para o formulário', () => {
    api('GET', '/solicitacoes', [solicitacao()]);
    api('GET', '/solicitacoes/100', solicitacao());
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('app-request-card', '#100').contains('button', 'Editar').click();
    cy.location('pathname').should('eq', '/patient/solicitacoes/100/editar');
  });

  it('editar com aceite pede confirmação', () => {
    const comAceite = solicitacao({ status: 'EM_ANDAMENTO', profissionais: [profissionalSolicitado({ vagasPreenchidas: 1 })] });
    api('GET', '/solicitacoes', [comAceite]);
    api('GET', '/solicitacoes/100', comAceite);
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('app-request-card', '#100').contains('button', 'Editar').click();
    cy.dialog('Editar solicitação').within(() => {
      cy.contains('Editar esta solicitação, que já tem profissionais aceitos?').should('be.visible');
      cy.button('Sim, editar a solicitação').click();
    });
    cy.location('pathname').should('eq', '/patient/solicitacoes/100/editar');
  });

  it('editar a menos de 48h do atendimento avisa da ocorrência', () => {
    const tardia = solicitacao({
      status: 'EM_ANDAMENTO',
      proximoAtendimentoInicio: inHours(20),
      profissionais: [profissionalSolicitado({ vagasPreenchidas: 1 })],
    });
    api('GET', '/solicitacoes', [tardia]);
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('app-request-card', '#100').contains('button', 'Editar').click();
    cy.dialog('Editar solicitação').should('contain', 'Falta menos de 48h para um atendimento desta solicitação.');
  });
});

describe('Paciente · Nova solicitação', () => {
  it('cria solicitação online', () => {
    api('POST', '/solicitacoes', solicitacao()).as('criar');
    cy.visitAs('/patient/novo', sessaoPaciente());
    cy.contains('h1', 'Nova solicitação').should('be.visible');
    preencherNovaSolicitacao();
    cy.button('Criar solicitação').click();
    cy.wait('@criar').its('request.body').should((body) => {
      expect(body.modalidade).to.eq('ONLINE');
      expect(body.endereco).to.eq(null);
      expect(body.profissionais).to.deep.eq([{ categoria: 'ENFERMEIRO', especialidadeIds: [3], quantidade: 1 }]);
    });
    cy.toast('Solicitação criada com sucesso!').should('be.visible');
    cy.location('pathname').should('eq', '/patient');
  });

  it('presencial exige e envia o endereço', () => {
    api('POST', '/solicitacoes', solicitacao()).as('criar');
    cy.visitAs('/patient/novo', sessaoPaciente());
    preencherNovaSolicitacao();
    cy.selectField('Modalidade', 'presencial');
    cy.button('Criar solicitação').click();
    cy.contains('h2', 'Endereço').should('be.visible');
    cy.get('.ui-input__error').should('exist');
    cy.fillField('CEP', '01310100');
    cy.fillField('Logradouro', 'Avenida Paulista');
    cy.fillField('Bairro', 'Bela Vista');
    cy.fillField('Cidade', 'São Paulo');
    cy.fillField('UF', 'sp');
    cy.fillField('Número', '1000');
    cy.button('Criar solicitação').click();
    cy.wait('@criar').its('request.body.endereco').should('include', { cep: '01310100', uf: 'SP' });
  });

  it('valida descrição curta, categoria e especialidades', () => {
    cy.visitAs('/patient/novo', sessaoPaciente());
    cy.fillField('Descreva sua necessidade', 'curto');
    cy.button('Criar solicitação').click();
    cy.contains('Descreva com mais detalhes (mínimo 20 caracteres).').should('be.visible');
    cy.contains('Selecione ao menos uma especialidade.').should('be.visible');
  });

  it('as especialidades dependem da categoria escolhida', () => {
    cy.visitAs('/patient/novo', sessaoPaciente());
    cy.selectField('Categoria', 'MEDICO');
    cy.contains('label', 'Especialidades').parent().find('[role="combobox"]').click();
    cy.contains('[role="option"]', 'Pediatria').should('be.visible');
    cy.contains('[role="option"]', 'Curativos').should('not.exist');
  });

  it('adiciona e remove linhas de profissionais e soma o total', () => {
    cy.visitAs('/patient/novo', sessaoPaciente());
    cy.fillField('Quantidade', '2');
    cy.button('+ Adicionar profissional').click();
    cy.get('.requested-professionals-card__row').should('have.length', 2);
    cy.contains('Total: 3 profissionais').should('be.visible');
    cy.get('[aria-label="Remover profissional"]').first().click();
    cy.get('.requested-professionals-card__row').should('have.length', 1);
  });

  it('linha repetida é recusada pelo back-end', () => {
    apiError('POST', '/solicitacoes', 'Há profissionais repetidos com as mesmas especialidades. Aumente a quantidade na linha existente.', 400);
    cy.visitAs('/patient/novo', sessaoPaciente());
    preencherNovaSolicitacao();
    cy.button('Criar solicitação').click();
    cy.toast('Há profissionais repetidos').should('be.visible');
  });

  it('com bloqueio por ocorrências o botão de criar fica desabilitado', () => {
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 3, bloqueio: bloqueio() }));
    cy.visitAs('/patient/novo', sessaoPaciente());
    cy.button('Criar solicitação').should('be.disabled');
  });

  it('em revalidação o botão de criar fica desabilitado', () => {
    api('GET', '/validacao/paciente', validacaoDetalhe('PACIENTE', { emRevalidacao: true, bloqueiaCriacao: true }));
    cy.visitAs('/patient/novo', sessaoPaciente());
    cy.button('Criar solicitação').should('be.disabled');
  });

  it('banido não cria solicitação', () => {
    api('GET', '/banimentos', { banimento: banimento() });
    cy.visitAs('/patient', sessaoPaciente('APROVADO', true));
    cy.button('Nova solicitação').should('be.disabled');
  });
});

describe('Paciente · Editar solicitação', () => {
  it('carrega os dados e salva as alterações', () => {
    api('GET', '/solicitacoes/100', solicitacao());
    api('PUT', '/solicitacoes/100', solicitacao()).as('salvar');
    cy.visitAs('/patient/solicitacoes/100/editar', sessaoPaciente());
    cy.contains('h1', 'Editar solicitação').should('be.visible');
    cy.field('Descreva sua necessidade').should('contain.value', 'Preciso de curativo diário');
    cy.fillField('Descreva sua necessidade', 'Preciso de curativo diário e troca de sonda.');
    cy.button('Salvar alterações').click();
    cy.wait('@salvar').its('request.body.descricao').should('eq', 'Preciso de curativo diário e troca de sonda.');
    cy.toast('Solicitação atualizada com sucesso!').should('be.visible');
  });

  it('com aceitos avisa que eles precisam reaceitar', () => {
    api('GET', '/solicitacoes/100', solicitacao({ status: 'EM_ANDAMENTO', profissionais: [profissionalSolicitado({ vagasPreenchidas: 1 })] }));
    cy.visitAs('/patient/solicitacoes/100/editar', sessaoPaciente());
    cy.contains('Esta solicitação já tem profissionais aceitos.').should('be.visible');
  });

  it('solicitação encerrada abre só para consulta', () => {
    api('GET', '/solicitacoes/100', solicitacao({ status: 'CONCLUIDA' }));
    cy.visitAs('/patient/solicitacoes/100/editar', sessaoPaciente());
    cy.contains('Esta solicitação não pode mais ser editada').should('be.visible');
    cy.button('Salvar alterações').should('not.exist');
    cy.field('Descreva sua necessidade').should('be.disabled');
  });

  it('com atendimento em andamento orienta a remarcar pelo atendimento', () => {
    api('GET', '/solicitacoes/100', solicitacao({ status: 'EM_ANDAMENTO', atendimentoEmAndamento: true }));
    cy.visitAs('/patient/solicitacoes/100/editar', sessaoPaciente());
    cy.contains('Há um atendimento acontecendo agora').should('be.visible');
  });

  it('solicitação inexistente volta para a lista', () => {
    api('GET', '/solicitacoes/999', { message: 'Não encontrada' }, 404);
    cy.visitAs('/patient/solicitacoes/999/editar', sessaoPaciente());
    cy.toast('Solicitação não encontrada.').should('be.visible');
    cy.location('pathname').should('eq', '/patient');
  });

  it('erro de edição do back-end aparece', () => {
    api('GET', '/solicitacoes/100', solicitacao());
    apiError('PUT', '/solicitacoes/100', 'Esta solicitação não pode mais ser editada.');
    cy.visitAs('/patient/solicitacoes/100/editar', sessaoPaciente());
    cy.button('Salvar alterações').click();
    cy.toast('Esta solicitação não pode mais ser editada.').should('be.visible');
  });
});

describe('Paciente · Histórico e reabrir solicitação', () => {
  it('lista concluídas e canceladas', () => {
    api('GET', '/solicitacoes', [
      solicitacao({ id: 101, status: 'CONCLUIDA' }),
      solicitacao({ id: 102, status: 'CANCELADA' }),
      solicitacao({ id: 103 }),
    ]);
    cy.visitAs('/patient/historico', sessaoPaciente());
    cy.contains('h1', 'Histórico de solicitações').should('be.visible');
    cy.get('app-request-card').should('have.length', 2);
    cy.contains('#103').should('not.exist');
  });

  it('histórico vazio', () => {
    cy.visitAs('/patient/historico', sessaoPaciente());
    cy.contains('Nenhuma solicitação encerrada').should('be.visible');
  });

  it('reabrir cria nova solicitação pré-preenchida e com prazo em branco', () => {
    api('GET', '/solicitacoes', [solicitacao({ status: 'CONCLUIDA' })]);
    api('GET', '/solicitacoes/100', solicitacao({ status: 'CONCLUIDA' }));
    api('POST', '/solicitacoes', solicitacao({ id: 120 })).as('criar');
    cy.visitAs('/patient/historico', sessaoPaciente());
    cy.button('Reabrir solicitação').click();
    cy.location('search').should('eq', '?baseadaEm=100');
    cy.contains('Os dados da solicitação anterior já estão preenchidos.').should('be.visible');
    cy.field('Descreva sua necessidade').should('contain.value', 'Preciso de curativo diário');
    cy.field('Prazo desejado').should('have.value', '');
    cy.field('Prazo desejado').type(dateOnly(7));
    cy.button('Criar solicitação').click();
    cy.wait('@criar');
  });

  it('com bloqueio o botão de reabrir fica desabilitado', () => {
    api('GET', '/solicitacoes', [solicitacao({ status: 'CANCELADA' })]);
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 3, bloqueio: bloqueio() }));
    cy.visitAs('/patient/historico', sessaoPaciente());
    cy.button('Reabrir solicitação').should('be.disabled');
  });

  it('falha ao copiar avisa para preencher os dados', () => {
    api('GET', '/solicitacoes/100', { message: 'erro' }, 500);
    cy.visitAs('/patient/novo?baseadaEm=100', sessaoPaciente());
    cy.toast('Não foi possível copiar a solicitação. Preencha os dados.').should('be.visible');
  });
});

describe('Paciente · Detalhe da solicitação', () => {
  it('solicitação inexistente mostra não encontrada', () => {
    api('GET', '/solicitacoes/999', { message: 'Não encontrada' }, 404);
    cy.visitAs('/patient/solicitacoes/999', sessaoPaciente());
    cy.contains('Solicitação não encontrada').should('be.visible');
  });

  it('sem propostas mostra o vazio', () => {
    api('GET', '/solicitacoes/100', solicitacao());
    api('GET', '/solicitacoes/100/propostas', []);
    cy.visitAs('/patient/solicitacoes/100', sessaoPaciente());
    cy.contains('Nenhuma proposta ainda').should('be.visible');
  });

  it('cancela pelo detalhe', () => {
    api('GET', '/solicitacoes/100', solicitacao());
    api('GET', '/solicitacoes/100/propostas', []);
    cy.intercept(route('PATCH', '/solicitacoes/100/cancelar'), solicitacao({ status: 'CANCELADA' })).as('cancelar');
    cy.visitAs('/patient/solicitacoes/100', sessaoPaciente());
    cy.button('Cancelar solicitação').click();
    cy.wait('@cancelar');
    cy.toast('Solicitação cancelada.').should('be.visible');
  });
});
