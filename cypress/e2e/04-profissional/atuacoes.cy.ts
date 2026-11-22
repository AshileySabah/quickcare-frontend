import { api, apiError } from '../../support/api';
import { atuacao, atuacaoMedico, inDays, inHours, minhaAtuacao, sessaoProfissional } from '../../support/factories';

const enfermeiro = minhaAtuacao();
const medicoPendente = minhaAtuacao({ atuacao: atuacaoMedico(), statusRegistro: 'PENDENTE', liberada: false });

function abrirPerfil(atuacoes = [enfermeiro, medicoPendente]) {
  api('GET', '/perfil/profissional/atuacoes', atuacoes);
  cy.visitAs('/professional/perfil', sessaoProfissional());
  cy.contains('h2', 'Atuação profissional').should('be.visible');
}

const item = (rotulo: string) => cy.get(`article[aria-label="${rotulo}"]`);

describe('Profissional · Atuações', () => {
  it('lista as atuações com status do registro', () => {
    abrirPerfil();
    item('Enfermeiro(a)').within(() => {
      cy.contains('Curativos, Sondagem').should('be.visible');
      cy.contains('COREN 123456/SP').should('be.visible');
    });
    item('Médico(a)').should('contain', 'Enquanto o registro não for aprovado, você não vê nem envia propostas');
  });

  it('cuidador aparece como sem registro e liberada', () => {
    abrirPerfil([
      enfermeiro,
      minhaAtuacao({
        atuacao: atuacao({ id: 12, categoria: 'CUIDADOR', rotulo: 'Cuidador(a)', siglaRegistro: null, registroProfissional: null, registroProfissionalUf: null }),
        statusRegistro: null,
      }),
    ]);
    item('Cuidador(a)').should('contain', 'Sem registro: liberada');
  });

  it('inclui uma atuação nova, que vai para validação', () => {
    api('POST', '/perfil/profissional/atuacoes', [enfermeiro, medicoPendente]).as('incluir');
    abrirPerfil([enfermeiro]);
    cy.button('Incluir atuação').click();
    cy.contains('option', 'Enfermeiro(a) (já incluída)').should('be.disabled');
    cy.selectField('Categoria profissional', 'MEDICO');
    cy.multiSelect('Especialidades', ['Clínica geral']);
    cy.fillField('CRM', '654321');
    cy.selectField('UF do registro', 'SP');
    cy.attachFile('Documento do registro', 'crm.pdf');
    cy.get('.practice-areas-manager__include').contains('button', 'Incluir atuação').click();
    cy.wait('@incluir');
    cy.toast('Atuação incluída. O registro dela vai para a validação do administrador.').should('be.visible');
    item('Médico(a)').should('exist');
  });

  it('incluir sem preencher marca os campos', () => {
    abrirPerfil([enfermeiro]);
    cy.button('Incluir atuação').click();
    cy.get('.practice-areas-manager__include').contains('button', 'Incluir atuação').click();
    cy.contains('Selecione uma categoria profissional.').should('be.visible');
  });

  it('cancelar a inclusão fecha o formulário', () => {
    abrirPerfil([enfermeiro]);
    cy.button('Incluir atuação').click();
    cy.get('.practice-areas-manager__include').contains('button', 'Cancelar').click();
    cy.get('.practice-areas-manager__include').should('not.exist');
  });

  it('altera especialidades sem impacto salva direto', () => {
    api('GET', '/perfil/profissional/atuacoes/10/impacto', { permitido: true, impedimento: null, propostas: [] });
    api('PUT', '/perfil/profissional/atuacoes/10/especialidades', [enfermeiro, medicoPendente]).as('salvar');
    abrirPerfil();
    cy.get('[aria-label="Editar especialidades de Enfermeiro(a)"]').click();
    cy.get('[aria-label="Remover Sondagem"]').click();
    cy.button('Salvar especialidades').click();
    cy.wait('@salvar').its('request.body').should('deep.equal', { especialidadeIds: [3] });
    cy.toast('Especialidades atualizadas.').should('be.visible');
  });

  it('tirar especialidade exigida por proposta aberta mostra o impacto', () => {
    api('GET', '/perfil/profissional/atuacoes/10/impacto', {
      permitido: true,
      impedimento: null,
      propostas: [{ propostaId: 200, solicitacaoId: 100, servico: 'Sondagem', status: 'ACEITA', inicio: inDays(5), termino: inHours(122), geraOcorrencia: true }],
    });
    abrirPerfil();
    cy.get('[aria-label="Editar especialidades de Enfermeiro(a)"]').click();
    cy.get('[aria-label="Remover Sondagem"]').click();
    cy.button('Salvar especialidades').click();
    cy.dialog('Alterar especialidades').within(() => {
      cy.contains('a proposta abaixo será cancelada').should('be.visible');
      cy.contains('conta como ocorrência para você').should('be.visible');
      cy.button('Não, manter as especialidades').click();
    });
  });

  it('não deixa salvar sem nenhuma especialidade', () => {
    abrirPerfil();
    cy.get('[aria-label="Editar especialidades de Enfermeiro(a)"]').click();
    cy.get('[aria-label="Remover Curativos"]').click();
    cy.get('[aria-label="Remover Sondagem"]').click();
    cy.button('Salvar especialidades').click();
    cy.contains('Selecione ao menos uma especialidade.').should('be.visible');
  });

  it('remove atuação sem nada aberto direto', () => {
    api('GET', '/perfil/profissional/atuacoes/11/impacto', { permitido: true, impedimento: null, propostas: [] });
    api('DELETE', '/perfil/profissional/atuacoes/11', [enfermeiro]).as('remover');
    abrirPerfil();
    cy.get('[aria-label="Remover Médico(a)"]').click();
    cy.wait('@remover');
    cy.toast('Atuação removida.').should('be.visible');
    item('Médico(a)').should('not.exist');
  });

  it('remover atuação com propostas abertas pede confirmação', () => {
    api('GET', '/perfil/profissional/atuacoes/10/impacto', {
      permitido: true,
      impedimento: null,
      propostas: [
        { propostaId: 200, solicitacaoId: 100, servico: 'Curativos', status: 'PENDENTE', inicio: inDays(5), termino: inHours(122), geraOcorrencia: false },
        { propostaId: 201, solicitacaoId: 101, servico: 'Sondagem', status: 'ACEITA', inicio: inDays(6), termino: inHours(146), geraOcorrencia: false },
      ],
    });
    api('DELETE', '/perfil/profissional/atuacoes/10', [medicoPendente]).as('remover');
    abrirPerfil();
    cy.get('[aria-label="Remover Enfermeiro(a)"]').click();
    cy.dialog('Remover atuação').within(() => {
      cy.contains('as 2 propostas abaixo serão canceladas').should('be.visible');
      cy.button('Sim, remover a atuação').click();
    });
    cy.wait('@remover');
  });

  it('remoção impedida por atendimento em andamento', () => {
    api('GET', '/perfil/profissional/atuacoes/10/impacto', {
      permitido: false,
      impedimento: 'Há um atendimento em andamento desta atuação. Remova depois que ele terminar.',
      propostas: [],
    });
    abrirPerfil();
    cy.get('[aria-label="Remover Enfermeiro(a)"]').click();
    cy.toast('Há um atendimento em andamento desta atuação.').should('be.visible');
  });

  it('com uma atuação só não mostra o remover', () => {
    abrirPerfil([enfermeiro]);
    cy.get('[aria-label="Remover Enfermeiro(a)"]').should('not.exist');
  });

  it('erro do back-end ao remover aparece', () => {
    api('GET', '/perfil/profissional/atuacoes/11/impacto', { permitido: true, impedimento: null, propostas: [] });
    apiError('DELETE', '/perfil/profissional/atuacoes/11', 'Você precisa de pelo menos uma atuação para usar a plataforma.');
    abrirPerfil();
    cy.get('[aria-label="Remover Médico(a)"]').click();
    cy.toast('Você precisa de pelo menos uma atuação').should('be.visible');
  });
});
