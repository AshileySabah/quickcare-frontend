import { api, apiError } from '../../support/api';
import {
  perfilPublicoPaciente,
  perfilPublicoProfissional,
  previaBloqueio,
  sessaoPaciente,
  sessaoProfissional,
  usuarioBloqueado,
} from '../../support/factories';

function abrirPerfilProfissional(extra: Record<string, unknown> = {}) {
  api('GET', '/profissionais/2/perfil', perfilPublicoProfissional(extra));
  cy.visitAs('/patient/profissionais/2', sessaoPaciente());
}

function preencherDenuncia() {
  cy.selectField('Motivo', 'comportamento_inadequado');
  cy.fillField('O que aconteceu', 'O profissional foi grosseiro durante todo o atendimento.');
}

describe('Denúncia', () => {
  it('paciente denuncia o profissional com anexo e depois decide não bloquear', () => {
    api('POST', '/denuncias', { id: 600 }).as('denunciar');
    abrirPerfilProfissional();
    cy.button('Denunciar').click();
    cy.dialog('Denunciar').within(() => {
      cy.contains('A pessoa denunciada não fica sabendo que foi você.').should('be.visible');
      preencherDenuncia();
      cy.attachFile('Prova (opcional)', 'print.png', 'image/png');
      cy.button('Sim, enviar a denúncia').click();
    });
    cy.wait('@denunciar').its('request.headers.content-type').should('include', 'multipart/form-data');
    cy.toast('Denúncia enviada.').should('be.visible');
    cy.dialog('Bloquear também?').within(() => cy.button('Não, só denunciar').click());
    cy.button('Denúncia em andamento').should('be.disabled');
  });

  it('depois de denunciar pode bloquear também', () => {
    api('POST', '/denuncias', { id: 600 });
    api('GET', '/bloqueios/profissionais/2/previa', previaBloqueio());
    api('POST', '/bloqueios/profissionais/2', usuarioBloqueado()).as('bloquear');
    abrirPerfilProfissional();
    cy.button('Denunciar').click();
    cy.dialog('Denunciar').within(() => {
      preencherDenuncia();
      cy.button('Sim, enviar a denúncia').click();
    });
    cy.dialog('Bloquear também?').within(() => cy.button('Sim, bloquear o profissional').click());
    cy.dialog('Bloquear').within(() => cy.button('Sim, bloquear o profissional').click());
    cy.wait('@bloquear');
  });

  it('valida motivo e descrição', () => {
    abrirPerfilProfissional();
    cy.button('Denunciar').click();
    cy.dialog('Denunciar').within(() => {
      cy.button('Sim, enviar a denúncia').click();
      cy.contains('Escolha o motivo da denúncia.').should('be.visible');
      cy.contains('Conte o que aconteceu.').should('be.visible');
      cy.fillField('O que aconteceu', 'curto');
      cy.contains('Escreva pelo menos 10 caracteres.').should('be.visible');
    });
  });

  it('sem atendimento entre os dois não mostra o botão de denunciar', () => {
    abrirPerfilProfissional({ podeDenunciar: false });
    cy.button('Denunciar').should('not.exist');
  });

  it('com denúncia em julgamento o botão fica desabilitado', () => {
    abrirPerfilProfissional({ denunciaEmAndamento: true });
    cy.button('Denúncia em andamento').should('be.disabled');
  });

  const recusas = [
    'Só dá para denunciar quem já teve um atendimento com você.',
    'Você já tem uma denúncia em julgamento sobre este perfil. Aguarde o resultado antes de enviar outra.',
    'Você não pode denunciar o seu próprio perfil.',
  ];
  recusas.forEach((mensagem) => {
    it(`back-end recusa: ${mensagem}`, () => {
      apiError('POST', '/denuncias', mensagem);
      abrirPerfilProfissional();
      cy.button('Denunciar').click();
      cy.dialog('Denunciar').within(() => {
        preencherDenuncia();
        cy.button('Sim, enviar a denúncia').click();
      });
      cy.toast(mensagem).should('be.visible');
      cy.dialog('Denunciar').should('exist');
    });
  });

  it('profissional denuncia o paciente', () => {
    api('GET', '/pacientes/1/perfil', perfilPublicoPaciente());
    api('POST', '/denuncias', { id: 601 }).as('denunciar');
    cy.visitAs('/professional/pacientes/1', sessaoProfissional());
    cy.button('Denunciar').click();
    cy.dialog('Denunciar').within(() => {
      cy.contains('Denunciar Ana Paciente?').should('be.visible');
      cy.selectField('Motivo', 'desrespeito_ou_assedio');
      cy.fillField('O que aconteceu', 'A paciente me ofendeu várias vezes no chat.');
      cy.button('Sim, enviar a denúncia').click();
    });
    cy.wait('@denunciar');
  });
});
