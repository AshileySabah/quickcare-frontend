import { api, apiError, route } from '../../support/api';
import {
  etapa,
  etapasPadrao,
  preValidacao,
  sessaoAdmin,
  sessaoPaciente,
  validacaoDetalhe,
  validacaoResumo,
} from '../../support/factories';

const etapaCard = (rotulo: string) => cy.get(`article[aria-label="Etapa ${rotulo}"]`);
const chips = (grupo: string) => cy.get(`[role="group"][aria-label="${grupo}"]`);

function abrirDetalhe(detalhe = validacaoDetalhe('PROFISSIONAL', { statusValidacao: 'PENDENTE', etapas: etapasPadrao('PROFISSIONAL', 'PENDENTE') })) {
  api('GET', '/admin/validacoes/profissionais/2', detalhe);
  cy.visitAs('/admin/profissionais/2', sessaoAdmin());
}

describe('Admin · menu e acesso', () => {
  it('mostra o menu do admin com contadores', () => {
    api('GET', '/admin/disputas/em-aberto', { total: 2 });
    api('GET', '/admin/denuncias/em-aberto', { total: 1 });
    api('GET', '/admin/recursos/em-aberto', { total: 3 });
    cy.visitAs('/admin', sessaoAdmin());
    cy.get('.ui-app-header').within(() => {
      cy.contains('a', 'Disputas').should('contain', '2');
      cy.contains('a', 'Denúncias').should('contain', '1');
      cy.contains('a', 'Ocorrências').should('contain', '3');
      cy.contains('a', 'Gerais').should('be.visible');
    });
    cy.get('[aria-label="Perfil em uso"]').should('not.exist');
  });

  it('admin não tem Meu perfil, Documentos nem Segurança', () => {
    cy.visitAs('/admin', sessaoAdmin());
    cy.get('[aria-label="Abrir menu da conta"]').click();
    cy.get('[role="menu"]').should('not.contain', 'Meu perfil').and('not.contain', 'Segurança').and('not.contain', 'Documentos');
  });

  it('paciente não entra nas telas do admin', () => {
    cy.visitAs('/admin/disputas', sessaoPaciente());
    cy.location('pathname').should('eq', '/acesso-negado');
  });
});

describe('Admin · fila de validação', () => {
  it('lista cadastros pendentes de profissionais por padrão', () => {
    cy.intercept(route('GET', '/admin/validacoes/profissionais'), [validacaoResumo()]).as('lista');
    cy.visitAs('/admin/validacao', sessaoAdmin());
    cy.wait('@lista').its('request.query').should('deep.equal', { status: 'PENDENTE' });
    cy.contains('.admin-dashboard__card-link', 'Bruno Enfermeiro').within(() => {
      cy.contains('Enfermeiro(a)').should('be.visible');
      cy.contains('bruno@quickcare.dev').should('be.visible');
    });
  });

  it('filtra por pacientes e por situação', () => {
    cy.intercept(route('GET', '/admin/validacoes/pacientes'), [validacaoResumo({ id: 1, perfil: 'PACIENTE', nome: 'Ana Paciente', atuacoes: null })]).as('pacientes');
    cy.intercept(route('GET', '/admin/validacoes/profissionais'), []).as('profissionais');
    cy.visitAs('/admin/validacao', sessaoAdmin());
    chips('Filtrar por perfil').contains('button', 'Pacientes').click();
    cy.wait('@pacientes');
    cy.contains('Ana Paciente').should('be.visible');
    chips('Filtrar por situação').contains('button', 'Em revalidação').click();
    cy.wait('@pacientes').its('request.query').should('deep.equal', { emRevalidacao: 'true' });
    chips('Filtrar por situação').contains('button', 'Todos').click();
    cy.wait('@pacientes').its('request.query').should('deep.equal', {});
  });

  it('fila vazia', () => {
    cy.visitAs('/admin/validacao', sessaoAdmin());
    cy.contains('Todos os cadastros enviados já foram avaliados.').should('be.visible');
  });

  it('cadastro em revalidação aparece marcado', () => {
    api('GET', '/admin/validacoes/profissionais', [validacaoResumo({ statusValidacao: 'APROVADO', emRevalidacao: true })]);
    cy.visitAs('/admin/validacao', sessaoAdmin());
    cy.contains('.admin-dashboard__card-link', 'Em revalidação').should('be.visible');
  });

  it('abre o detalhe do cadastro', () => {
    api('GET', '/admin/validacoes/profissionais', [validacaoResumo()]);
    api('GET', '/admin/validacoes/profissionais/2', validacaoDetalhe('PROFISSIONAL', { statusValidacao: 'PENDENTE' }));
    cy.visitAs('/admin/validacao', sessaoAdmin());
    cy.contains('.admin-dashboard__card-link', 'Bruno Enfermeiro').click();
    cy.location('pathname').should('eq', '/admin/profissionais/2');
    cy.contains('h1', 'Bruno Enfermeiro').should('be.visible');
  });
});

describe('Admin · decidir etapas', () => {
  it('aprova uma etapa com justificativa', () => {
    api(
      'POST',
      '/admin/validacoes/profissionais/2/etapas/CPF/decisao',
      validacaoDetalhe('PROFISSIONAL', {
        statusValidacao: 'PENDENTE',
        etapas: [etapa({ status: 'APROVADA' }), ...etapasPadrao('PROFISSIONAL', 'PENDENTE').slice(1)],
      }),
    ).as('decidir');
    abrirDetalhe();
    etapaCard('CPF').within(() => {
      cy.fillField('Justificativa', 'CPF conferido na Receita.');
      cy.button('Aprovar').click();
    });
    cy.wait('@decidir').its('request.headers.content-type').should('include', 'multipart/form-data');
    cy.toast('Etapa "CPF" aprovada.').should('be.visible');
    etapaCard('CPF').should('contain', 'Aprovada');
  });

  it('reprova uma etapa com anexo opcional', () => {
    api(
      'POST',
      '/admin/validacoes/profissionais/2/etapas/IDENTIDADE/decisao',
      validacaoDetalhe('PROFISSIONAL', { statusValidacao: 'REPROVADO', etapas: [etapa({ id: 2, tipo: 'IDENTIDADE', descricao: 'Documento de identidade', status: 'REPROVADA', justificativa: 'Foto ilegível.' })] }),
    ).as('decidir');
    abrirDetalhe();
    etapaCard('Documento de identidade').within(() => {
      cy.fillField('Justificativa', 'Foto ilegível.');
      cy.attachFile('Anexo (opcional)', 'print.png', 'image/png');
      cy.button('Reprovar').click();
    });
    cy.wait('@decidir');
    etapaCard('Documento de identidade').should('contain', 'Reprovada');
  });

  it('justificativa é obrigatória para aprovar e reprovar', () => {
    abrirDetalhe();
    etapaCard('CPF').within(() => {
      cy.button('Aprovar').click();
      cy.get('.ui-textarea__error').should('be.visible');
      cy.button('Reprovar').click();
      cy.get('.ui-textarea__error').should('be.visible');
    });
  });

  it('decisão do registro envia a atuação', () => {
    cy.intercept(route('POST', '/admin/validacoes/profissionais/2/etapas/REGISTRO_PROFISSIONAL/decisao'), validacaoDetalhe('PROFISSIONAL')).as('decidir');
    abrirDetalhe();
    etapaCard('Registro profissional').within(() => {
      cy.fillField('Justificativa', 'COREN ativo no conselho regional.');
      cy.button('Aprovar').click();
    });
    cy.wait('@decidir').its('request.query').should('deep.equal', { atuacao: '10' });
  });

  it('etapa já avaliada é recusada', () => {
    apiError('POST', '/admin/validacoes/profissionais/2/etapas/CPF/decisao', 'Esta etapa já foi avaliada.');
    abrirDetalhe();
    etapaCard('CPF').within(() => {
      cy.fillField('Justificativa', 'Documento conferido na Receita.');
      cy.button('Aprovar').click();
    });
    cy.toast('Esta etapa já foi avaliada.').should('be.visible');
  });

  it('justificativa curta demais é recusada', () => {
    abrirDetalhe();
    etapaCard('CPF').within(() => {
      cy.fillField('Justificativa', 'Ok.');
      cy.button('Aprovar').click();
      cy.contains('Descreva com mais detalhes (mínimo 10 caracteres).').should('be.visible');
    });
  });

  it('cadastro inexistente', () => {
    api('GET', '/admin/validacoes/profissionais/999', { message: 'x' }, 404);
    cy.visitAs('/admin/profissionais/999', sessaoAdmin());
    cy.contains('Cadastro não encontrado').should('be.visible');
  });

  it('cadastro antigo sem etapas', () => {
    abrirDetalhe(validacaoDetalhe('PROFISSIONAL', { etapas: [] }));
    cy.contains('Este cadastro é anterior à validação cadastral').should('be.visible');
  });

  it('em revalidação recolhe as etapas aprovadas sem alteração', () => {
    abrirDetalhe(
      validacaoDetalhe('PROFISSIONAL', {
        emRevalidacao: true,
        bloqueiaCriacao: true,
        etapas: [etapa({ status: 'PENDENTE' }), ...etapasPadrao('PROFISSIONAL').slice(1)],
      }),
    );
    cy.contains('Em revalidação').should('be.visible');
    cy.contains('summary', 'Etapas sem alteração, já aprovadas (2)').should('be.visible');
  });
});

describe('Admin · pré-validação', () => {
  it('pré-valida uma etapa, mostra o parecer e preenche a justificativa', () => {
    api('POST', '/admin/validacoes/profissionais/2/etapas/CPF/pre-validacao', preValidacao()).as('pre');
    abrirDetalhe();
    etapaCard('CPF').within(() => {
      cy.button('Pré-validar esta etapa').click();
      cy.contains('Parecer favorável').should('be.visible');
      cy.contains('via Serpro').should('be.visible');
      cy.contains('Sugestão da pré-validação: aprovar').should('be.visible');
      cy.field('Justificativa').should('have.value', 'CPF regular na Receita Federal.');
    });
  });

  it('parecer desfavorável sugere reprovar', () => {
    api('POST', '/admin/validacoes/profissionais/2/etapas/CPF/pre-validacao', preValidacao({ parecer: 'DESFAVORAVEL', verificacoes: [{ campo: 'CPF', provedor: 'Serpro', parecer: 'DESFAVORAVEL', motivos: ['CPF suspenso.'], observacoes: [] }] }));
    abrirDetalhe();
    etapaCard('CPF').within(() => {
      cy.button('Pré-validar esta etapa').click();
      cy.contains('Sugestão da pré-validação: reprovar').should('be.visible');
    });
  });

  it('sem API orienta validação manual', () => {
    api('POST', '/admin/validacoes/profissionais/2/etapas/IDENTIDADE/pre-validacao', preValidacao({ tipo: 'IDENTIDADE', parecer: 'SEM_API', verificacoes: [{ campo: 'RG', provedor: null, parecer: 'SEM_API', motivos: ['Não há API pública.'], observacoes: [] }] }));
    abrirDetalhe();
    etapaCard('Documento de identidade').within(() => {
      cy.button('Pré-validar esta etapa').click();
      cy.contains('Sem API pública: validação manual').should('be.visible');
    });
  });

  it('erro na consulta permite tentar de novo', () => {
    apiError('POST', '/admin/validacoes/profissionais/2/etapas/CPF/pre-validacao', 'Serviço indisponível.', 503);
    abrirDetalhe();
    etapaCard('CPF').within(() => {
      cy.button('Pré-validar esta etapa').click();
      cy.contains('Não foi possível pré-validar esta etapa').should('be.visible');
      cy.button('Tentar de novo').should('be.visible');
    });
  });

  it('pré-validar todas consulta cada etapa pendente', () => {
    cy.intercept(route('POST', /^\/admin\/validacoes\/profissionais\/2\/etapas\/\w+\/pre-validacao$/), preValidacao()).as('pre');
    abrirDetalhe();
    cy.button('Pré-validar todas as etapas').click();
    cy.wait(['@pre', '@pre', '@pre']);
  });
});
