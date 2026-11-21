import { api, apiError } from '../../support/api';
import {
  banimento,
  bloqueio,
  inDays,
  ocorrencia,
  resumoOcorrencias,
  sessaoPaciente,
  sessaoProfissional,
} from '../../support/factories';

const card = () => cy.get('.occurrences-card');

describe('Ocorrências', () => {
  it('sem ocorrências recentes o quadro não aparece', () => {
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('h1', 'Minhas solicitações').should('be.visible');
    card().should('not.exist');
  });

  it('mostra as ocorrências e a regra de contagem', () => {
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 2, ocorrencias: [ocorrencia(), ocorrencia({ id: 801, motivo: 'NAO_COMPARECIMENTO', podeRecorrer: false })] }));
    cy.visitAs('/patient', sessaoPaciente());
    card().within(() => {
      cy.contains('2 de 3 contando nos últimos 90 dias.').should('be.visible');
      cy.contains('Ao chegar a 3, você fica pelo menos 7 dias sem criar solicitações.').should('be.visible');
      cy.contains('Cancelou um atendimento fora da tolerância de 48h').should('be.visible');
      cy.contains('Não compareceu a um atendimento').should('be.visible');
      cy.get('button').filter(':contains("Recorrer")').should('have.length', 1);
    });
  });

  it('bloqueado vê o fim do bloqueio e o botão de criar desabilitado', () => {
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 3, bloqueio: bloqueio(), ocorrencias: [ocorrencia()] }));
    cy.visitAs('/patient', sessaoPaciente());
    card().within(() => {
      cy.contains('Bloqueado').should('be.visible');
      cy.contains('Por excesso de ocorrências, você não pode criar solicitações até').should('be.visible');
    });
    cy.button('Nova solicitação').should('be.disabled');
  });

  it('profissional bloqueado não envia propostas', () => {
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 3, bloqueio: bloqueio(), ocorrencias: [ocorrencia()] }));
    cy.visitAs('/professional', sessaoProfissional());
    card().should('contain', 'você não pode enviar propostas até');
  });

  it('recorre de uma ocorrência', () => {
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 1, ocorrencias: [ocorrencia()] }));
    api(
      'POST',
      '/ocorrencias/800/recurso',
      resumoOcorrencias({ contando: 1, ocorrencias: [ocorrencia({ podeRecorrer: false, recurso: { id: 1, status: 'EM_ANALISE', texto: 'x', criadoEm: inDays(0) } })] }),
    ).as('recorrer');
    cy.visitAs('/patient', sessaoPaciente());
    card().contains('button', 'Recorrer').click();
    cy.dialog('Recorrer da ocorrência').within(() => {
      cy.contains('Você só pode recorrer uma vez de cada ocorrência.').should('be.visible');
      cy.fillField('Por que ela não deveria contar?', 'Cancelei porque fui internada.');
      cy.button('Sim, enviar o recurso').click();
    });
    cy.wait('@recorrer').its('request.body').should('deep.equal', { texto: 'Cancelei porque fui internada.' });
    cy.toast('Recurso enviado.').should('be.visible');
    card().should('contain', 'Recurso em análise');
    card().contains('button', 'Recorrer').should('not.exist');
  });

  it('recurso exige o texto', () => {
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 1, ocorrencias: [ocorrencia()] }));
    cy.visitAs('/patient', sessaoPaciente());
    card().contains('button', 'Recorrer').click();
    cy.dialog('Recorrer da ocorrência').within(() => {
      cy.button('Sim, enviar o recurso').click();
      cy.contains('Campo obrigatório.').should('be.visible');
    });
  });

  it('recurso negado mostra o motivo', () => {
    api(
      'GET',
      '/ocorrencias',
      resumoOcorrencias({
        contando: 1,
        ocorrencias: [ocorrencia({ podeRecorrer: false, recurso: { id: 1, status: 'MANTIDA', texto: 'x', criadoEm: inDays(-2), justificativaDecisao: 'Sem comprovação.' } })],
      }),
    );
    cy.visitAs('/patient', sessaoPaciente());
    card().should('contain', 'Recurso negado').and('contain', 'Motivo: Sem comprovação.');
  });

  it('anulada e "já gerou bloqueio" aparecem marcadas', () => {
    api(
      'GET',
      '/ocorrencias',
      resumoOcorrencias({ contando: 0, ocorrencias: [ocorrencia({ anulada: true, podeRecorrer: false }), ocorrencia({ id: 801, jaGerouBloqueio: true, podeRecorrer: false })] }),
    );
    cy.visitAs('/patient', sessaoPaciente());
    card().should('contain', 'Anulada').and('contain', 'Já gerou bloqueio').and('contain', 'não contam mais');
  });

  it('erro ao recorrer aparece', () => {
    api('GET', '/ocorrencias', resumoOcorrencias({ contando: 1, ocorrencias: [ocorrencia()] }));
    apiError('POST', '/ocorrencias/800/recurso', 'Este recurso já foi decidido.');
    cy.visitAs('/patient', sessaoPaciente());
    card().contains('button', 'Recorrer').click();
    cy.dialog('Recorrer da ocorrência').within(() => {
      cy.fillField('Por que ela não deveria contar?', 'Motivo qualquer.');
      cy.button('Sim, enviar o recurso').click();
    });
    cy.toast('Este recurso já foi decidido.').should('be.visible');
  });
});

describe('Banimento', () => {
  it('suspensão mostra o aviso com motivo e data de fim', () => {
    api('GET', '/banimentos', { banimento: banimento() });
    cy.visitAs('/patient', sessaoPaciente('APROVADO', true));
    cy.get('.ban-notice').within(() => {
      cy.contains('Perfil banido').should('be.visible');
      cy.contains('Este perfil está banido até').should('be.visible');
      cy.contains('Motivo: Comportamento inadequado com profissionais.').should('be.visible');
    });
    cy.button('Nova solicitação').should('be.disabled');
  });

  it('permanente avisa que é de forma permanente', () => {
    api('GET', '/banimentos', { banimento: banimento({ tipo: 'PERMANENTE', fim: undefined }) });
    cy.visitAs('/patient', sessaoPaciente('APROVADO', true));
    cy.get('.ban-notice').should('contain', 'banido de forma permanente');
  });

  it('recorre do banimento uma vez', () => {
    api('GET', '/banimentos', { banimento: banimento() });
    api('POST', '/banimentos/950/recurso', {
      banimento: banimento({ podeRecorrer: false, recurso: { status: 'EM_ANALISE', texto: 'x', criadoEm: inDays(0) } }),
    }).as('recorrer');
    cy.visitAs('/patient', sessaoPaciente('APROVADO', true));
    cy.get('.ban-notice').contains('button', 'Recorrer').click();
    cy.dialog('Recorrer do banimento').within(() => {
      cy.fillField('Por que o banimento deveria ser removido?', 'Foi um mal-entendido com o profissional.');
      cy.button('Sim, enviar o recurso').click();
    });
    cy.wait('@recorrer');
    cy.toast('Recurso enviado.').should('be.visible');
    cy.get('.ban-notice').should('contain', 'Recurso enviado em');
    cy.get('.ban-notice').contains('button', 'Recorrer').should('not.exist');
  });

  it('recurso negado mostra a decisão', () => {
    api('GET', '/banimentos', {
      banimento: banimento({ podeRecorrer: false, recurso: { status: 'NEGADO', texto: 'x', criadoEm: inDays(-2), justificativa: 'Provas confirmam a conduta.' } }),
    });
    cy.visitAs('/patient', sessaoPaciente('APROVADO', true));
    cy.get('.ban-notice').should('contain', 'Decisão do recurso: Provas confirmam a conduta.');
  });

  it('banimento já encerrado não aceita recurso', () => {
    api('GET', '/banimentos', { banimento: banimento() });
    apiError('POST', '/banimentos/950/recurso', 'Este banimento já foi encerrado.');
    cy.visitAs('/patient', sessaoPaciente('APROVADO', true));
    cy.get('.ban-notice').contains('button', 'Recorrer').click();
    cy.dialog('Recorrer do banimento').within(() => {
      cy.fillField('Por que o banimento deveria ser removido?', 'Texto do recurso.');
      cy.button('Sim, enviar o recurso').click();
    });
    cy.toast('Este banimento já foi encerrado.').should('be.visible');
  });

  it('profissional banido vê o aviso na home', () => {
    api('GET', '/banimentos', { banimento: banimento({ perfil: 'PROFISSIONAL' }) });
    cy.visitAs('/professional', sessaoProfissional('APROVADO', true));
    cy.get('.ban-notice').should('be.visible');
  });
});
