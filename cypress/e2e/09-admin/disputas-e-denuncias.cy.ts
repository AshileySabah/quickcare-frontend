import { api, apiError, route } from '../../support/api';
import {
  banimento,
  denunciaDetalhe,
  denunciaResumo,
  disputaDetalhe,
  disputaResumo,
  inDays,
  problema,
  sessaoAdmin,
} from '../../support/factories';

const chips = (grupo: string) => cy.get(`[role="group"][aria-label="${grupo}"]`);

describe('Admin · disputas', () => {
  it('lista as disputas em aberto por padrão', () => {
    cy.intercept(route('GET', '/admin/disputas'), [disputaResumo()]).as('lista');
    cy.visitAs('/admin/disputas', sessaoAdmin());
    cy.wait('@lista').its('request.url').should('include', 'status=EM_DISPUTA');
    cy.contains('.admin-disputes__card-link', 'Enfermeiro(a) · Curativos').within(() => {
      cy.contains('Ana Paciente (paciente) · Bruno Enfermeiro (profissional)').should('be.visible');
      cy.contains('O outro não compareceu').should('be.visible');
    });
  });

  it('filtra as disputas por situação', () => {
    cy.intercept(route('GET', '/admin/disputas'), []).as('lista');
    cy.visitAs('/admin/disputas', sessaoAdmin());
    cy.wait('@lista');
    cy.contains('Nenhuma disputa aguardando decisão.').should('be.visible');
    chips('Filtrar por situação').contains('button', 'Aguardando resposta').click();
    cy.wait('@lista').its('request.url').should('include', 'AGUARDANDO_RESPOSTA');
    chips('Filtrar por situação').contains('button', 'Todos').click();
    cy.wait('@lista');
  });

  it('decide a disputa: realizado, sem ocorrência', () => {
    api('GET', '/admin/disputas/700', disputaDetalhe());
    api('POST', '/admin/disputas/700/decisao', disputaDetalhe({ problema: problema({ status: 'DECIDIDO', decisao: 'REALIZADO', decisaoJustificativa: 'As fotos comprovam.', decididoEm: inDays(0) }) })).as('decidir');
    cy.visitAs('/admin/disputas/700', sessaoAdmin());
    cy.contains('h1', 'Enfermeiro(a) · Curativos').should('be.visible');
    cy.contains('Eu estive lá, o paciente não abriu a porta.').should('be.visible');
    cy.contains('Proposta aceita: atendimento agendado').should('be.visible');
    cy.selectField('O atendimento', 'realizado');
    cy.button('Registrar decisão').click();
    cy.dialog('Registrar decisão').within(() => {
      cy.fillField('Justificativa', 'As fotos comprovam.');
      cy.button('Sim, registrar a decisão').click();
    });
    cy.wait('@decidir').its('request.body').should('deep.equal', { decisao: 'REALIZADO', ocorrenciaPara: [], justificativa: 'As fotos comprovam.' });
    cy.contains('o atendimento foi realizado').should('be.visible');
  });

  it('decide: não realizado com ocorrência para o profissional', () => {
    api('GET', '/admin/disputas/700', disputaDetalhe());
    api('POST', '/admin/disputas/700/decisao', disputaDetalhe()).as('decidir');
    cy.visitAs('/admin/disputas/700', sessaoAdmin());
    cy.selectField('O atendimento', 'nao_realizado');
    cy.contains('.ui-checkbox', 'Bruno Enfermeiro (profissional)').find('input').should('be.checked');
    cy.contains('.ui-checkbox', 'Ana Paciente (paciente)').find('input').should('not.be.checked');
    cy.button('Registrar decisão').click();
    cy.dialog('Registrar decisão').within(() => {
      cy.fillField('Justificativa', 'O profissional não comprovou presença.');
      cy.button('Sim, registrar a decisão').click();
    });
    cy.wait('@decidir').its('request.body.ocorrenciaPara').should('deep.equal', ['PROFISSIONAL']);
  });

  it('justificativa da decisão é obrigatória', () => {
    api('GET', '/admin/disputas/700', disputaDetalhe());
    cy.visitAs('/admin/disputas/700', sessaoAdmin());
    cy.selectField('O atendimento', 'realizado');
    cy.button('Registrar decisão').click();
    cy.dialog('Registrar decisão').within(() => {
      cy.button('Sim, registrar a decisão').click();
      cy.contains('Campo obrigatório.').should('be.visible');
    });
  });

  it('perfil congelado não deixa decidir', () => {
    api('GET', '/admin/disputas/700', disputaDetalhe());
    apiError('POST', '/admin/disputas/700/decisao', 'A pessoa encerrou o perfil: a disputa fica congelada até ela recuperar ou o prazo acabar.');
    cy.visitAs('/admin/disputas/700', sessaoAdmin());
    cy.selectField('O atendimento', 'realizado');
    cy.button('Registrar decisão').click();
    cy.dialog('Registrar decisão').within(() => {
      cy.fillField('Justificativa', 'Ok.');
      cy.button('Sim, registrar a decisão').click();
    });
    cy.toast('a disputa fica congelada').should('be.visible');
  });

  it('relato sem contestação não tem decisão a tomar', () => {
    api('GET', '/admin/disputas/700', disputaDetalhe({ problema: problema() }));
    cy.visitAs('/admin/disputas/700', sessaoAdmin());
    cy.contains('Sem contestação: não há decisão a tomar.').should('be.visible');
    cy.contains('Ainda não contestou.').should('be.visible');
  });

  it('disputa inexistente', () => {
    api('GET', '/admin/disputas/999', { message: 'x' }, 404);
    cy.visitAs('/admin/disputas/999', sessaoAdmin());
    cy.contains('Disputa não encontrada').should('be.visible');
  });
});

describe('Admin · denúncias', () => {
  it('lista as em julgamento por padrão', () => {
    cy.intercept(route('GET', '/admin/denuncias'), [denunciaResumo()]).as('lista');
    cy.visitAs('/admin/denuncias', sessaoAdmin());
    cy.wait('@lista');
    cy.contains('.admin-reports__card-link', 'Comportamento inadequado').should('be.visible');
    chips('Filtrar por situação').contains('button', 'Julgadas').click();
    cy.wait('@lista').its('request.url').should('match', /PROCEDENTE/);
  });

  it('julga procedente com ocorrência', () => {
    api('GET', '/admin/denuncias/600', denunciaDetalhe());
    api(
      'POST',
      '/admin/denuncias/600/decisao',
      denunciaDetalhe({ resumo: denunciaResumo({ status: 'PROCEDENTE' }), consequencia: 'OCORRENCIA', justificativaDecisao: 'Relato confirmado.', ocorrencia: { id: 800, anulada: false } }),
    ).as('julgar');
    cy.visitAs('/admin/denuncias/600', sessaoAdmin());
    cy.contains('O profissional foi grosseiro durante todo o atendimento.').should('be.visible');
    cy.contains('Sem anexo.').should('be.visible');
    cy.selectField('A denúncia é', 'procedente');
    cy.selectField('Consequência para quem foi denunciado', 'ocorrencia');
    cy.button('Registrar decisão').click();
    cy.dialog('Registrar decisão').within(() => {
      cy.contains('Julgar a denúncia como procedente?').should('be.visible');
      cy.fillField('Justificativa', 'Relato confirmado.');
      cy.button('Sim, registrar a decisão').click();
    });
    cy.wait('@julgar').its('request.body').should('deep.include', { resultado: 'PROCEDENTE', consequencia: 'OCORRENCIA' });
    cy.contains('Justificativa: Relato confirmado.').should('be.visible');
    cy.contains('Ocorrência gerada').should('be.visible');
  });

  it('julga procedente com banimento por suspensão', () => {
    api('GET', '/admin/denuncias/600', denunciaDetalhe());
    api(
      'POST',
      '/admin/denuncias/600/decisao',
      denunciaDetalhe({ resumo: denunciaResumo({ status: 'PROCEDENTE' }), consequencia: 'BANIMENTO', justificativaDecisao: 'Grave.', banimento: banimento({ perfil: 'PROFISSIONAL' }) }),
    ).as('julgar');
    cy.visitAs('/admin/denuncias/600', sessaoAdmin());
    cy.selectField('A denúncia é', 'procedente');
    cy.selectField('Consequência para quem foi denunciado', 'banimento');
    cy.selectField('Tipo de banimento', 'suspensao');
    cy.selectField('Duração', '15');
    cy.button('Registrar decisão').click();
    cy.dialog('Registrar decisão').within(() => {
      cy.fillField('Justificativa', 'Grave.');
      cy.button('Sim, registrar a decisão').click();
    });
    cy.wait('@julgar').its('request.body').should('deep.include', { tipoBanimento: 'SUSPENSAO', diasSuspensao: 15 });
    cy.contains('Banimento aplicado').should('be.visible');
  });

  it('banimento exige o tipo', () => {
    api('GET', '/admin/denuncias/600', denunciaDetalhe());
    cy.visitAs('/admin/denuncias/600', sessaoAdmin());
    cy.selectField('A denúncia é', 'procedente');
    cy.selectField('Consequência para quem foi denunciado', 'banimento');
    cy.button('Registrar decisão').click();
    cy.contains('Escolha o tipo de banimento.').should('be.visible');
  });

  it('julga improcedente', () => {
    api('GET', '/admin/denuncias/600', denunciaDetalhe());
    api('POST', '/admin/denuncias/600/decisao', denunciaDetalhe({ resumo: denunciaResumo({ status: 'IMPROCEDENTE' }), justificativaDecisao: 'Sem provas.' })).as('julgar');
    cy.visitAs('/admin/denuncias/600', sessaoAdmin());
    cy.selectField('A denúncia é', 'improcedente');
    cy.contains('label', 'Consequência para quem foi denunciado').should('not.exist');
    cy.button('Registrar decisão').click();
    cy.dialog('Registrar decisão').within(() => {
      cy.contains('Julgar a denúncia como improcedente?').should('be.visible');
      cy.fillField('Justificativa', 'Sem provas.');
      cy.button('Sim, registrar a decisão').click();
    });
    cy.wait('@julgar').its('request.body').should('deep.include', { resultado: 'IMPROCEDENTE', consequencia: null });
  });

  it('denúncia julgada com recurso em análise leva ao perfil do denunciado', () => {
    api(
      'GET',
      '/admin/denuncias/600',
      denunciaDetalhe({
        resumo: denunciaResumo({ status: 'PROCEDENTE' }),
        consequencia: 'OCORRENCIA',
        justificativaDecisao: 'Ok.',
        ocorrencia: { id: 800, anulada: false, recurso: { id: 1, status: 'EM_ANALISE', texto: 'Não fui grosseiro.', criadoEm: inDays(-1) } },
      }),
    );
    cy.visitAs('/admin/denuncias/600', sessaoAdmin());
    cy.contains('Recurso: Não fui grosseiro.').should('be.visible');
    cy.button('Decidir o recurso').click();
    cy.location('pathname').should('eq', '/admin/perfis/professional/2');
  });

  it('denúncia inexistente', () => {
    api('GET', '/admin/denuncias/999', { message: 'x' }, 404);
    cy.visitAs('/admin/denuncias/999', sessaoAdmin());
    cy.contains('Denúncia não encontrada').should('be.visible');
  });
});
