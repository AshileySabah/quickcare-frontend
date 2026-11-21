import { api, apiError, route } from '../../support/api';
import {
  arquivo,
  etapa,
  etapasPadrao,
  sessaoPaciente,
  sessaoProfissional,
  validacaoDetalhe,
} from '../../support/factories';

const card = (titulo: string) => cy.get(`article[aria-label="${titulo}"]`);

describe('Documentos · paciente', () => {
  it('abre pelo menu e mostra cada etapa com status e documento', () => {
    cy.visitAs('/patient', sessaoPaciente());
    cy.get('[aria-label="Abrir menu da conta"]').click();
    cy.contains('[role="menuitem"]', 'Documentos').click();
    cy.location('pathname').should('eq', '/patient/documentos');
    cy.contains('Cadastro aprovado').should('be.visible');
    card('CPF').should('contain', '529.982.247-25').and('contain', 'cpf.pdf');
    card('Documento de identidade').should('contain', 'RG 123456782').and('contain', 'rg.pdf');
  });

  it('abre o documento enviado em outra guia', () => {
    cy.intercept(route('GET', '/validacao/arquivos/cpf.pdf'), { statusCode: 200, body: '%PDF', headers: { 'content-type': 'application/pdf' } }).as('arquivo');
    cy.visitAs('/patient/documentos', sessaoPaciente());
    cy.window().then((win) => cy.stub(win, 'open').returns({ location: { href: '' }, close: () => undefined }).as('abrir'));
    card('CPF').find('[aria-label="Abrir cpf.pdf em outra guia"]').click();
    cy.wait('@arquivo');
    cy.get('@abrir').should('have.been.called');
  });

  it('edita o CPF com novo documento e manda para revalidação', () => {
    api('POST', '/validacao/paciente/etapas/CPF/reenvio', validacaoDetalhe('PACIENTE', { emRevalidacao: true, bloqueiaCriacao: true })).as('reenviar');
    cy.visitAs('/patient/documentos', sessaoPaciente());
    cy.get('[aria-label="Editar CPF"]').click();
    card('CPF').within(() => {
      cy.contains('Os dados voltam para análise do administrador.').should('be.visible');
      cy.fillField('CPF', '11144477735');
      cy.get('[aria-label="Substituir cpf.pdf"]').click();
      cy.get('input[type="file"]').selectFile({ contents: Cypress.Buffer.from('%PDF'), fileName: 'cpf-novo.pdf', mimeType: 'application/pdf' }, { force: true });
      cy.button('Enviar para validação').click();
    });
    cy.wait('@reenviar');
    cy.toast('Enviado para validação.').should('be.visible');
    cy.contains('Dados em revalidação').should('be.visible');
  });

  it('CPF inválido na edição é recusado', () => {
    cy.visitAs('/patient/documentos', sessaoPaciente());
    cy.get('[aria-label="Editar CPF"]').click();
    card('CPF').within(() => {
      cy.fillField('CPF', '11111111111');
      cy.button('Enviar para validação').click();
      cy.contains('CPF inválido.').should('be.visible');
    });
  });

  it('sem nenhuma mudança pergunta se quer enviar mesmo assim', () => {
    api('POST', '/validacao/paciente/etapas/IDENTIDADE/reenvio', validacaoDetalhe('PACIENTE')).as('reenviar');
    cy.visitAs('/patient/documentos', sessaoPaciente());
    cy.get('[aria-label="Editar Documento de identidade"]').click();
    card('Documento de identidade').within(() => cy.button('Enviar para validação').click());
    cy.dialog('Nada mudou').within(() => {
      cy.contains('Mesmo assim, a etapa volta para a análise do administrador.').should('be.visible');
      cy.button('Sim, enviar para validação').click();
    });
    cy.wait('@reenviar');
  });

  it('cancelar a edição volta para os dados', () => {
    cy.visitAs('/patient/documentos', sessaoPaciente());
    cy.get('[aria-label="Editar CPF"]').click();
    card('CPF').within(() => {
      cy.button('Cancelar').click();
      cy.button('Enviar para validação').should('not.exist');
    });
  });

  it('etapa reprovada abre já em edição com o motivo', () => {
    api(
      'GET',
      '/validacao/paciente',
      validacaoDetalhe('PACIENTE', {
        statusValidacao: 'REPROVADO',
        etapas: [
          etapa({ id: 1, tipo: 'CPF', descricao: 'CPF', status: 'REPROVADA', justificativa: 'Documento ilegível.', anexo: arquivo('orientacao.pdf') }),
          etapa({ id: 2, tipo: 'IDENTIDADE', descricao: 'Documento de identidade', status: 'APROVADA' }),
        ],
      }),
    );
    cy.visitAs('/patient/documentos', sessaoPaciente());
    cy.contains('Algo foi reprovado').should('be.visible');
    card('CPF').within(() => {
      cy.contains('Motivo da reprovação').should('be.visible');
      cy.contains('Documento ilegível.').should('be.visible');
      cy.contains('orientacao.pdf').should('be.visible');
      cy.contains('Corrija o que for preciso e envie de novo').should('be.visible');
      cy.button('Cancelar').should('not.exist');
    });
  });

  it('filtra as etapas por status', () => {
    api(
      'GET',
      '/validacao/paciente',
      validacaoDetalhe('PACIENTE', {
        etapas: [etapa({ id: 1, tipo: 'CPF', descricao: 'CPF', status: 'PENDENTE' }), etapa({ id: 2, tipo: 'IDENTIDADE', descricao: 'Documento de identidade' })],
      }),
    );
    cy.visitAs('/patient/documentos', sessaoPaciente());
    cy.contains('button', 'Em análise').click();
    card('CPF').should('exist');
    card('Documento de identidade').should('not.exist');
    cy.contains('button', 'Reprovados').click();
    cy.contains('Nenhum documento com este status.').should('be.visible');
  });

  it('paciente pendente vê os detalhes da validação na home', () => {
    api('GET', '/validacao/paciente', validacaoDetalhe('PACIENTE', { statusValidacao: 'PENDENTE', etapas: etapasPadrao('PACIENTE', 'PENDENTE') }));
    cy.visitAs('/patient', sessaoPaciente('PENDENTE'));
    cy.button('Ver detalhes').click();
    cy.contains('Cadastro em análise').should('be.visible');
    card('CPF').should('exist');
  });

  it('em revalidação a home avisa e leva para Documentos', () => {
    api('GET', '/validacao/paciente', validacaoDetalhe('PACIENTE', { emRevalidacao: true, bloqueiaCriacao: true }));
    cy.visitAs('/patient', sessaoPaciente());
    cy.contains('Seus dados estão em revalidação.').should('be.visible');
    cy.button('Documentos').click();
    cy.location('pathname').should('eq', '/patient/documentos');
  });

  it('erro do back-end no reenvio aparece', () => {
    apiError('POST', '/validacao/paciente/etapas/CPF/reenvio', 'Envie o documento desta etapa.', 400);
    cy.visitAs('/patient/documentos', sessaoPaciente());
    cy.get('[aria-label="Editar CPF"]').click();
    card('CPF').within(() => {
      cy.fillField('CPF', '11144477735');
      cy.button('Enviar para validação').click();
    });
    cy.toast('Envie o documento desta etapa.').should('be.visible');
  });
});

describe('Documentos · profissional', () => {
  it('mostra o registro de cada atuação e oferece incluir CNPJ', () => {
    cy.visitAs('/professional/documentos', sessaoProfissional());
    card('Registro profissional').should('contain', '123456 / SP').and('contain', 'Curativos, Sondagem');
    card('CNPJ').should('contain', 'Opcional.');
  });

  it('inclui um CNPJ, que exige documento', () => {
    api('POST', '/validacao/profissional/etapas/CNPJ/reenvio', validacaoDetalhe('PROFISSIONAL', { emRevalidacao: true, bloqueiaCriacao: true })).as('cnpj');
    cy.visitAs('/professional/documentos', sessaoProfissional());
    card('CNPJ').within(() => {
      cy.button('Incluir CNPJ').click();
      cy.contains('Informe o CNPJ e envie o documento que o comprova').should('be.visible');
      cy.fillField('CNPJ', '11222333000181');
      cy.button('Enviar para validação').click();
      cy.contains('Envie o documento desta etapa.').should('be.visible');
      cy.get('input[type="file"]').selectFile({ contents: Cypress.Buffer.from('%PDF'), fileName: 'cnpj.pdf', mimeType: 'application/pdf' }, { force: true });
      cy.button('Enviar para validação').click();
    });
    cy.wait('@cnpj');
  });

  it('editar o registro aprovado avisa que a atuação volta para análise', () => {
    api('POST', '/validacao/profissional/etapas/REGISTRO_PROFISSIONAL/reenvio', validacaoDetalhe('PROFISSIONAL', { emRevalidacao: true })).as('registro');
    cy.visitAs('/professional/documentos', sessaoProfissional());
    cy.get('[aria-label="Editar Registro profissional"]').click();
    card('Registro profissional').within(() => {
      cy.contains('você não envia novas propostas de Enfermeiro(a)').should('be.visible');
      cy.fillField('COREN', '999888');
      cy.button('Enviar para validação').click();
    });
    cy.wait('@registro').its('request.url').should('include', 'atuacao=10');
    cy.contains('Registro em análise').should('be.visible');
  });

  it('profissional pendente acompanha as etapas na tela de validação', () => {
    api('GET', '/validacao/profissional', validacaoDetalhe('PROFISSIONAL', { statusValidacao: 'PENDENTE', etapas: etapasPadrao('PROFISSIONAL', 'PENDENTE') }));
    cy.visitAs('/professional/aguardando-validacao', sessaoProfissional('PENDENTE'));
    cy.contains('Olá, Bruno Enfermeiro.').should('be.visible');
    cy.contains('Cadastro em análise').should('be.visible');
  });

  it('profissional reprovado corrige e reenvia pela tela de validação', () => {
    api(
      'GET',
      '/validacao/profissional',
      validacaoDetalhe('PROFISSIONAL', {
        statusValidacao: 'REPROVADO',
        etapas: [etapa({ id: 1, tipo: 'CPF', descricao: 'CPF', status: 'REPROVADA', justificativa: 'CPF não confere.' })],
      }),
    );
    api('POST', '/validacao/profissional/etapas/CPF/reenvio', validacaoDetalhe('PROFISSIONAL', { statusValidacao: 'PENDENTE', etapas: [etapa({ status: 'PENDENTE' })] })).as('reenviar');
    cy.visitAs('/professional/aguardando-validacao', sessaoProfissional('REPROVADO'));
    card('CPF').within(() => {
      cy.contains('CPF não confere.').should('be.visible');
      cy.fillField('CPF', '11144477735');
      cy.button('Enviar para validação').click();
    });
    cy.wait('@reenviar');
    cy.contains('Cadastro em análise').should('be.visible');
  });
});
