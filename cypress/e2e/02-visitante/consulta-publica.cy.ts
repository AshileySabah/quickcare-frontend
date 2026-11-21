import { api, apiSequence, route } from '../../support/api';
import {
  atuacao,
  atuacaoMedico,
  perfilPublicoProfissional,
  profissionalPublico,
  resumoAvaliacoes,
  sessaoPaciente,
  solicitacaoPublica,
} from '../../support/factories';

describe('Home pública', () => {
  beforeEach(() => cy.visitGuest('/'));

  it('apresenta a plataforma e leva ao cadastro de paciente e de profissional', () => {
    cy.contains('h1', 'Atendimento de saúde sob demanda').should('be.visible');
    cy.button('Quero ser atendido').click();
    cy.location('pathname').should('eq', '/cadastro/paciente');
    cy.go('back');
    cy.button('Quero atender').click();
    cy.location('pathname').should('eq', '/cadastro/profissional');
  });

  it('header leva ao login e ao cadastro', () => {
    cy.get('.ui-app-header').contains('Entrar').click();
    cy.location('pathname').should('eq', '/login');
    cy.visitGuest('/');
    cy.get('.ui-app-header').contains('Cadastre-se').click();
    cy.location('pathname').should('eq', '/cadastro');
  });

  it('links de consulta levam aos profissionais e às solicitações abertas', () => {
    cy.contains('a', 'Nossos profissionais').click();
    cy.location('pathname').should('eq', '/consulta/profissionais');
    cy.visitGuest('/');
    cy.contains('a.home__cta-option', 'Solicitações abertas').click();
    cy.location('pathname').should('eq', '/consulta/solicitacoes');
  });
});

describe('Consulta pública de profissionais', () => {
  it('/consulta abre a lista de profissionais', () => {
    cy.visitGuest('/consulta');
    cy.location('pathname').should('eq', '/consulta/profissionais');
  });

  it('lista profissionais aprovados com nota e atendimentos', () => {
    api('GET', '/publico/profissionais', [
      profissionalPublico(),
      profissionalPublico({ id: 5, nome: 'Dra. Paula Médica', atuacoes: [atuacaoMedico()], avaliacoes: resumoAvaliacoes(null, 0), atendimentosConcluidos: 1 }),
    ]);
    cy.visitGuest('/consulta/profissionais');
    cy.contains('h1', 'Profissionais de saúde').should('be.visible');
    cy.contains('.public-list__link', 'Bruno Enfermeiro').within(() => {
      cy.contains('Enfermeiro(a)').should('be.visible');
      cy.contains('4,5').should('be.visible');
      cy.contains('(8 avaliações)').should('be.visible');
      cy.contains('12 atendimentos').should('be.visible');
    });
    cy.contains('.public-list__link', 'Dra. Paula Médica').within(() => {
      cy.contains('Ainda sem avaliações').should('be.visible');
      cy.contains('1 atendimento').should('be.visible');
    });
  });

  it('mostra estado vazio quando nada é encontrado', () => {
    cy.visitGuest('/consulta/profissionais');
    cy.contains('Nenhum profissional encontrado').should('be.visible');
  });

  it('mostra erro e permite tentar de novo', () => {
    apiSequence('GET', '/publico/profissionais', [
      { statusCode: 500, body: { message: 'Erro' } },
      { body: [profissionalPublico()] },
    ]);
    cy.visitGuest('/consulta/profissionais');
    cy.contains('Tentar novamente').should('be.visible');
    cy.button('Tentar novamente').click();
    cy.contains('Bruno Enfermeiro').should('be.visible');
  });

  it('filtra por categoria, especialidade, cidade, UF, modalidade e nota mínima', () => {
    cy.intercept(route('GET', '/publico/profissionais'), (req) => req.reply([])).as('buscar');
    cy.visitGuest('/consulta/profissionais');
    cy.wait('@buscar');
    cy.selectField('Categoria', 'ENFERMEIRO');
    cy.field('Especialidade').find('option').should('contain', 'Curativos').and('not.contain', 'Pediatria');
    cy.selectField('Especialidade', '3');
    cy.selectField('Atendimento', 'presencial');
    cy.fillField('Cidade', 'Campinas');
    cy.selectField('UF', 'SP');
    cy.selectField('Avaliação', '4');
    cy.wait('@buscar').its('request.query').should('include', {
      categoria: 'ENFERMEIRO',
      especialidadeId: '3',
      modalidade: 'PRESENCIAL',
      cidade: 'Campinas',
      uf: 'SP',
      notaMinima: '4',
    });
  });

  it('trocar a categoria limpa a especialidade escolhida', () => {
    cy.visitGuest('/consulta/profissionais');
    cy.selectField('Categoria', 'ENFERMEIRO');
    cy.selectField('Especialidade', '3');
    cy.selectField('Categoria', 'MEDICO');
    cy.field('Especialidade').should('have.value', null);
  });

  it('limpar filtros refaz a busca sem parâmetros', () => {
    cy.intercept(route('GET', '/publico/profissionais'), (req) => req.reply([])).as('buscar');
    cy.visitGuest('/consulta/profissionais');
    cy.wait('@buscar');
    cy.selectField('Categoria', 'MEDICO');
    cy.wait('@buscar');
    cy.button('Limpar filtros').click();
    cy.wait('@buscar').its('request.query').should('deep.equal', {});
  });

  it('pagina a lista de 5 em 5', () => {
    const lista = Array.from({ length: 7 }, (_, index) => profissionalPublico({ id: index + 10, nome: `Profissional ${index + 1}` }));
    api('GET', '/publico/profissionais', lista);
    cy.visitGuest('/consulta/profissionais');
    cy.get('.public-list__link').should('have.length', 5);
    cy.contains('Mostrando 1–5 de 7').should('be.visible');
    cy.get('[aria-label="Próxima página"]').click();
    cy.get('.public-list__link').should('have.length', 2);
    cy.contains('Profissional 7').should('be.visible');
    cy.selectField('Por página', '10');
    cy.get('.public-list__link').should('have.length', 7);
  });

  it('abre o perfil público do profissional', () => {
    api('GET', '/publico/profissionais', [profissionalPublico()]);
    api('GET', '/publico/profissionais/2', perfilPublicoProfissional({ atuacoes: [atuacao(), atuacaoMedico()] }));
    cy.visitGuest('/consulta/profissionais');
    cy.contains('.public-list__link', 'Bruno Enfermeiro').click();
    cy.location('pathname').should('eq', '/consulta/profissionais/2');
    cy.contains('Bruno Enfermeiro').should('be.visible');
    cy.contains('COREN 123456/SP').should('be.visible');
    cy.contains('CRM 654321/SP').should('be.visible');
    cy.contains('São Paulo/SP').should('be.visible');
    cy.contains('Pontualidade').should('be.visible');
    cy.button('Quero ser atendido').click();
    cy.location('pathname').should('eq', '/cadastro/paciente');
  });

  it('perfil sem avaliações mostra "Ainda sem avaliações"', () => {
    api('GET', '/publico/profissionais/2', perfilPublicoProfissional({ avaliacoes: resumoAvaliacoes(null, 0) }));
    cy.visitGuest('/consulta/profissionais/2');
    cy.contains('Ainda sem avaliações').should('be.visible');
  });

  it('perfil inexistente, bloqueado ou encerrado mostra não encontrado', () => {
    api('GET', '/publico/profissionais/999', { message: 'Perfil não encontrado.' }, 404);
    cy.visitGuest('/consulta/profissionais/999');
    cy.contains('Perfil não encontrado').should('be.visible');
  });

  it('paciente logado busca profissionais dentro da área dele', () => {
    api('GET', '/publico/profissionais', [profissionalPublico()]);
    cy.visitAs('/patient/profissionais', sessaoPaciente());
    cy.contains('.public-list__link', 'Bruno Enfermeiro').should('have.attr', 'href', '/patient/profissionais/2');
  });
});

describe('Consulta pública de solicitações', () => {
  it('lista solicitações sem nome nem descrição e convida a atender', () => {
    api('GET', '/publico/solicitacoes', [
      solicitacaoPublica(),
      solicitacaoPublica({ id: 301, modalidade: 'ONLINE', cidade: undefined, uf: undefined }),
    ]);
    cy.visitGuest('/consulta/solicitacoes');
    cy.contains('h1', 'Solicitações abertas').should('be.visible');
    cy.contains('Presencial · Campinas/SP').should('be.visible');
    cy.contains('Enfermeiro(a): Curativos · 1 de 2 vagas abertas').should('be.visible');
    cy.contains('.public-list__highlight', /^\s*Online\s*$/).should('be.visible');
    cy.contains('Preciso de').should('not.exist');
    cy.button('Quero atender').first().click();
    cy.location('pathname').should('eq', '/cadastro/profissional');
  });

  it('mostra estado vazio', () => {
    cy.visitGuest('/consulta/solicitacoes');
    cy.contains('Nenhuma solicitação aberta').should('be.visible');
  });

  it('não mostra o filtro de avaliação', () => {
    cy.visitGuest('/consulta/solicitacoes');
    cy.contains('label', 'Avaliação').should('not.exist');
  });
});
