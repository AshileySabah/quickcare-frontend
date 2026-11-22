import { api, apiError, route } from '../../support/api';
import {
  banimento,
  bloqueio,
  inDays,
  motivoBloqueio,
  ocorrencia,
  perfilAdminDetalhe,
  perfilAdminResumo,
  sessaoAdmin,
} from '../../support/factories';

const chips = (grupo: string) => cy.get(`[role="group"][aria-label="${grupo}"]`);
const secao = (titulo: string) => cy.contains('h2', titulo).closest('ui-card');

function abrirPerfil(detalhe = perfilAdminDetalhe()) {
  api('GET', '/admin/perfis/PACIENTE/1', detalhe);
  cy.visitAs('/admin/perfis/patient/1', sessaoAdmin());
  cy.contains('h1', 'Ana Paciente').should('be.visible');
}

function justificar(titulo: string, confirmar: string, texto = 'Justificativa do admin.') {
  cy.dialog(titulo).within(() => {
    cy.fillField('Justificativa', texto);
    cy.button(confirmar).click();
  });
}

describe('Admin · fila de ocorrências', () => {
  it('lista por demanda, começando pelos perfis com ocorrências', () => {
    cy.intercept(route('GET', '/admin/perfis'), [
      perfilAdminResumo({ recursosEmAnalise: 1 }),
      perfilAdminResumo({ usuarioId: 2, perfil: 'PROFISSIONAL', nome: 'Bruno Enfermeiro', email: 'bruno@quickcare.dev', bloqueio: bloqueio(), ocorrenciasContando: 3 }),
    ]).as('lista');
    cy.visitAs('/admin/ocorrencias', sessaoAdmin());
    cy.wait('@lista').its('request.query.situacao').should('eq', 'COM_OCORRENCIAS');
    cy.contains('.admin-profiles__card-link', 'Ana Paciente').should('contain', 'Para analisar');
    cy.contains('.admin-profiles__card-link', 'Bruno Enfermeiro').should('contain', 'Bloqueado até');
  });

  it('filtra por situação, perfil e busca', () => {
    cy.intercept(route('GET', '/admin/perfis'), []).as('lista');
    cy.visitAs('/admin/ocorrencias', sessaoAdmin());
    cy.wait('@lista');
    chips('Filtrar por situação').contains('button', 'Bloqueados').click();
    cy.wait('@lista').its('request.query.situacao').should('eq', 'BLOQUEADOS');
    chips('Filtrar por perfil').contains('button', 'Profissionais').click();
    cy.wait('@lista').its('request.query.perfil').should('eq', 'PROFISSIONAL');
    cy.fillField('Buscar', 'bruno');
    cy.wait('@lista').its('request.query.busca').should('eq', 'bruno');
    cy.contains('Ninguém nesta situação com esses filtros.').should('be.visible');
  });

  it('perfil congelado aparece marcado', () => {
    api('GET', '/admin/perfis', [perfilAdminResumo({ congeladoEm: inDays(-2) })]);
    cy.visitAs('/admin/ocorrencias', sessaoAdmin());
    cy.contains('.admin-profiles__card-link', 'Congelado').should('be.visible');
  });
});

describe('Admin · detalhe do perfil · ocorrências', () => {
  it('lança ocorrência manual', () => {
    api('POST', '/admin/perfis/PACIENTE/1/ocorrencias', perfilAdminDetalhe({ ocorrencias: [ocorrencia(), ocorrencia({ id: 801, motivo: 'MANUAL', justificativa: 'Falta grave.' })] })).as('lancar');
    abrirPerfil();
    secao('Ocorrências').contains('button', 'Lançar ocorrência').click();
    justificar('Lançar ocorrência', 'Sim, lançar a ocorrência', 'Falta grave.');
    cy.wait('@lancar').its('request.body').should('deep.equal', { justificativa: 'Falta grave.' });
    cy.toast('Ocorrência lançada.').should('be.visible');
  });

  it('anula ocorrência', () => {
    api('PATCH', '/admin/ocorrencias/800/anular', perfilAdminDetalhe({ ocorrencias: [ocorrencia({ anulada: true, anuladaPor: 'Admin', justificativaAnulacao: 'Engano.' })] })).as('anular');
    abrirPerfil();
    secao('Ocorrências').contains('button', 'Anular').click();
    justificar('Anular ocorrência', 'Sim, anular a ocorrência', 'Engano.');
    cy.wait('@anular');
    secao('Ocorrências').should('contain', 'Anulada');
  });

  it('justificativa é obrigatória', () => {
    abrirPerfil();
    secao('Ocorrências').contains('button', 'Lançar ocorrência').click();
    cy.dialog('Lançar ocorrência').within(() => {
      cy.button('Sim, lançar a ocorrência').click();
      cy.contains('Campo obrigatório.').should('be.visible');
    });
  });

  it('aceita o recurso e anula a ocorrência', () => {
    abrirPerfil(perfilAdminDetalhe({ ocorrencias: [ocorrencia({ recurso: { id: 5, status: 'EM_ANALISE', texto: 'Fui internada.', criadoEm: inDays(-1) } })] }));
    cy.intercept(route('PATCH', '/admin/recursos/5/decisao'), perfilAdminDetalhe()).as('decidir');
    secao('Ocorrências').within(() => {
      cy.contains('Fui internada.').should('be.visible');
      cy.button('Aceitar e anular').click();
    });
    justificar('Aceitar recurso', 'Sim, aceitar o recurso');
    cy.wait('@decidir').its('request.body').should('deep.include', { anular: true, consequenciaSeNegado: null });
  });

  it('nega o recurso de ocorrência de denúncia e escolhe banir', () => {
    abrirPerfil(perfilAdminDetalhe({ ocorrencias: [ocorrencia({ motivo: 'DENUNCIA_PROCEDENTE', recurso: { id: 5, status: 'EM_ANALISE', texto: 'Injusto.', criadoEm: inDays(-1) } })] }));
    cy.intercept(route('PATCH', '/admin/recursos/5/decisao'), perfilAdminDetalhe()).as('decidir');
    secao('Ocorrências').contains('button', 'Negar').click();
    cy.dialog('Negar recurso').within(() => {
      cy.selectField('O que acontece com a pessoa', 'banimento');
      cy.selectField('Tipo de banimento', 'permanente');
      cy.fillField('Justificativa', 'Provas claras.');
      cy.button('Sim, negar o recurso').click();
    });
    cy.wait('@decidir').its('request.body').should('deep.include', { anular: false, consequenciaSeNegado: 'BANIMENTO', tipoBanimento: 'PERMANENTE' });
  });

  it('decide motivo de bloqueio tardio', () => {
    abrirPerfil(perfilAdminDetalhe({ motivosDeBloqueio: [motivoBloqueio()] }));
    cy.intercept(route('PATCH', '/admin/motivos-de-bloqueio/650/decisao'), perfilAdminDetalhe()).as('decidir');
    secao('Motivos de bloqueio a menos de 48h').within(() => {
      cy.contains('Bloqueou Bruno Enfermeiro').should('be.visible');
      cy.button('Negar e lançar ocorrência').click();
    });
    justificar('Negar motivo', 'Sim, negar e lançar');
    cy.wait('@decidir').its('request.body.aceitar').should('eq', false);
  });

  it('aceita motivo de bloqueio tardio', () => {
    abrirPerfil(perfilAdminDetalhe({ motivosDeBloqueio: [motivoBloqueio()] }));
    cy.intercept(route('PATCH', '/admin/motivos-de-bloqueio/650/decisao'), perfilAdminDetalhe()).as('decidir');
    cy.button('Aceitar, sem ocorrência').click();
    justificar('Aceitar motivo', 'Sim, aceitar o motivo');
    cy.wait('@decidir').its('request.body.aceitar').should('eq', true);
  });

  it('perfil congelado avisa que nenhuma decisão pode ser tomada', () => {
    abrirPerfil(perfilAdminDetalhe({ resumo: perfilAdminResumo({ congeladoEm: inDays(-3) }) }));
    cy.contains('Congelado').should('be.visible');
    cy.contains('as pendências ficam congeladas e nenhuma decisão pode ser tomada').should('be.visible');
  });

  it('perfil inexistente', () => {
    api('GET', '/admin/perfis/PACIENTE/999', { message: 'x' }, 404);
    cy.visitAs('/admin/perfis/patient/999', sessaoAdmin());
    cy.contains('Perfil não encontrado').should('be.visible');
  });
});

describe('Admin · detalhe do perfil · bloqueio de ação', () => {
  it('aplica bloqueio', () => {
    api('POST', '/admin/perfis/PACIENTE/1/bloqueios', perfilAdminDetalhe({ resumo: perfilAdminResumo({ bloqueio: bloqueio() }), bloqueios: [bloqueio({ aplicadoPor: 'Admin', justificativa: 'Abuso.' })] })).as('bloquear');
    abrirPerfil();
    secao('Bloqueio').contains('button', 'Aplicar bloqueio').click();
    justificar('Aplicar bloqueio', 'Sim, aplicar o bloqueio', 'Abuso.');
    cy.wait('@bloquear');
    cy.toast('Bloqueio aplicado.').should('be.visible');
    secao('Bloqueio').should('contain', 'Nível 1');
  });

  it('remove bloqueio', () => {
    api('PATCH', '/admin/bloqueios/900/remover', perfilAdminDetalhe()).as('remover');
    abrirPerfil(perfilAdminDetalhe({ resumo: perfilAdminResumo({ bloqueio: bloqueio() }), bloqueios: [bloqueio()] }));
    secao('Bloqueio').contains('button', 'Remover bloqueio').click();
    justificar('Remover bloqueio', 'Sim, remover o bloqueio');
    cy.wait('@remover');
    cy.toast('Bloqueio removido.').should('be.visible');
  });

  it('bloquear quem já está bloqueado é recusado', () => {
    apiError('POST', '/admin/perfis/PACIENTE/1/bloqueios', 'Este perfil já está bloqueado.');
    abrirPerfil();
    secao('Bloqueio').contains('button', 'Aplicar bloqueio').click();
    justificar('Aplicar bloqueio', 'Sim, aplicar o bloqueio');
    cy.toast('Este perfil já está bloqueado.').should('be.visible');
  });
});

describe('Admin · detalhe do perfil · banimento', () => {
  it('bane por suspensão com número de dias livre e os dois perfis', () => {
    api('POST', '/admin/perfis/PACIENTE/1/banimentos', perfilAdminDetalhe({ banimentos: [banimento()] })).as('banir');
    abrirPerfil();
    secao('Banimento').contains('button', 'Banir').click();
    cy.dialog('Banir').within(() => {
      cy.selectField('Tipo de banimento', 'suspensao');
      cy.selectField('Duração', 'outro');
      cy.fillField('Quantos dias', '45');
      cy.contains('.ui-checkbox', 'Banir também o outro perfil desta pessoa').click();
      cy.fillField('Justificativa', 'Reincidência.');
      cy.button('Sim, banir').click();
    });
    cy.wait('@banir').its('request.body').should('deep.equal', { tipo: 'SUSPENSAO', dias: 45, ambosPerfis: true, justificativa: 'Reincidência.' });
    cy.toast('Banimento aplicado.').should('be.visible');
    secao('Banimento').should('contain', 'Suspensão até');
  });

  it('valida o número de dias da suspensão', () => {
    abrirPerfil();
    secao('Banimento').contains('button', 'Banir').click();
    cy.dialog('Banir').within(() => {
      cy.selectField('Tipo de banimento', 'suspensao');
      cy.selectField('Duração', 'outro');
      cy.fillField('Quantos dias', '400');
      cy.fillField('Justificativa', 'x');
      cy.button('Sim, banir').click();
      cy.contains('Informe de 1 a 365 dias.').should('be.visible');
    });
  });

  it('bane de forma permanente', () => {
    api('POST', '/admin/perfis/PACIENTE/1/banimentos', perfilAdminDetalhe({ banimentos: [banimento({ tipo: 'PERMANENTE', fim: undefined })] })).as('banir');
    abrirPerfil();
    secao('Banimento').contains('button', 'Banir').click();
    cy.dialog('Banir').within(() => {
      cy.selectField('Tipo de banimento', 'permanente');
      cy.fillField('Justificativa', 'Fraude.');
      cy.button('Sim, banir').click();
    });
    cy.wait('@banir').its('request.body.dias').should('eq', null);
    secao('Banimento').should('contain', 'Permanente');
  });

  it('remove o banimento', () => {
    api('PATCH', '/admin/banimentos/950/remover', perfilAdminDetalhe()).as('remover');
    abrirPerfil(perfilAdminDetalhe({ resumo: perfilAdminResumo({ banido: true }), banimentos: [banimento()] }));
    secao('Banimento').contains('button', 'Remover banimento').click();
    justificar('Remover banimento', 'Sim, remover o banimento');
    cy.wait('@remover');
    cy.toast('Banimento removido.').should('be.visible');
  });

  it('aceita o recurso do banimento e desbane', () => {
    api('PATCH', '/admin/banimentos/950/recurso/decisao', perfilAdminDetalhe()).as('decidir');
    abrirPerfil(perfilAdminDetalhe({ banimentos: [banimento({ recurso: { status: 'EM_ANALISE', texto: 'Foi um engano.', criadoEm: inDays(-1) } })] }));
    secao('Banimento').within(() => {
      cy.contains('Recurso: Foi um engano.').should('be.visible');
      cy.button('Aceitar e desbanir').click();
    });
    justificar('Aceitar recurso', 'Sim, aceitar o recurso');
    cy.wait('@decidir').its('request.body.aceitar').should('eq', true);
  });

  it('nega o recurso do banimento', () => {
    api('PATCH', '/admin/banimentos/950/recurso/decisao', perfilAdminDetalhe({ banimentos: [banimento({ podeRecorrer: false, recurso: { status: 'NEGADO', texto: 'x', criadoEm: inDays(-1), justificativa: 'Mantido.' } })] })).as('decidir');
    abrirPerfil(perfilAdminDetalhe({ banimentos: [banimento({ recurso: { status: 'EM_ANALISE', texto: 'Foi um engano.', criadoEm: inDays(-1) } })] }));
    secao('Banimento').contains('button', 'Negar recurso').click();
    justificar('Negar recurso', 'Sim, negar o recurso', 'Mantido.');
    cy.wait('@decidir').its('request.body.aceitar').should('eq', false);
    secao('Banimento').should('contain', 'Decisão: Mantido.');
  });

  it('banir o outro perfil que não existe é recusado', () => {
    apiError('POST', '/admin/perfis/PACIENTE/1/banimentos', 'Esta pessoa não tem o outro perfil para banir.');
    abrirPerfil();
    secao('Banimento').contains('button', 'Banir').click();
    cy.dialog('Banir').within(() => {
      cy.selectField('Tipo de banimento', 'permanente');
      cy.contains('.ui-checkbox', 'Banir também o outro perfil desta pessoa').click();
      cy.fillField('Justificativa', 'x');
      cy.button('Sim, banir').click();
    });
    cy.toast('Esta pessoa não tem o outro perfil para banir.').should('be.visible');
  });
});
