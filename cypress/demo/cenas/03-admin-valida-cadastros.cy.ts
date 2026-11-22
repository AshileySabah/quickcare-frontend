import { route } from '../../support/api';
import { MARIANA, RAFAEL, sessaoAdminDemo, sessaoProfissionalDemo } from '../support/elenco';
import { RITMO, entrar, legenda, pausa, quem } from '../support/estudio';
import { ValidacaoAoVivo } from '../support/roteiro';

const etapaAdmin = (rotulo: string) => cy.get(`article[aria-label="Etapa ${rotulo}"]`);

function decidir(rotulo: string, botao: 'Aprovar' | 'Reprovar', justificativa?: string) {
  etapaAdmin(rotulo).within(() => {
    if (justificativa) {
      cy.fillField('Justificativa', justificativa);
    }
    pausa(600);
    cy.button(botao).click();
  });
  pausa();
}

describe('Cena 3 · Admin valida os cadastros', () => {
  it('admin confere as etapas, reprova uma, Rafael corrige e os dois são aprovados', () => {
    const rafael = new ValidacaoAoVivo(RAFAEL, 'PROFISSIONAL');
    const mariana = new ValidacaoAoVivo(MARIANA, 'PACIENTE');
    rafael.ligarAdmin();
    rafael.ligarPessoa();
    mariana.ligarAdmin();
    cy.intercept(route('GET', '/admin/validacoes/profissionais'), (req) => req.reply([rafael.resumo()]));
    cy.intercept(route('GET', '/admin/validacoes/pacientes'), (req) => req.reply([mariana.resumo()]));

    entrar('/admin/validacao', sessaoAdminDemo());
    legenda('Cena 3 · Admin valida os cadastros', 'Administrador');
    pausa();
    cy.contains('.admin-dashboard__card-link', RAFAEL.nome).click();
    cy.contains('h1', RAFAEL.nome).should('be.visible');
    pausa();

    cy.button('Pré-validar todas as etapas').click();
    etapaAdmin('CPF').should('contain', 'Parecer favorável');
    pausa(RITMO.leitura);

    decidir('CPF', 'Aprovar');
    decidir('Documento de identidade', 'Aprovar', 'RG conferido com a foto do documento enviado.');
    decidir('CNPJ', 'Aprovar');
    decidir('Registro profissional', 'Reprovar', 'A foto do COREN está ilegível. Envie uma imagem nítida da carteira.');
    etapaAdmin('Registro profissional').should('contain', 'Reprovada');
    pausa(RITMO.leitura);

    quem('Rafael Lima, enfermeiro');
    entrar('/professional/aguardando-validacao', sessaoProfissionalDemo(RAFAEL, 'REPROVADO'));
    cy.get('article[aria-label="Registro profissional"]').within(() => {
      cy.contains('A foto do COREN está ilegível').should('be.visible');
      pausa(RITMO.leitura);
      cy.get('[aria-label="Substituir coren-rafael.pdf"]').click();
      cy.get('input[type="file"]').selectFile(
        { contents: Cypress.Buffer.from('%PDF-1.4 demo'), fileName: 'coren-legivel.pdf', mimeType: 'application/pdf' },
        { force: true },
      );
      pausa();
      cy.button('Enviar para validação').click();
    });
    cy.contains('Cadastro em análise').should('be.visible');
    pausa(RITMO.leitura);

    quem('Administrador');
    entrar(`/admin/profissionais/${RAFAEL.usuarioId}`, sessaoAdminDemo());
    decidir('Registro profissional', 'Aprovar', 'COREN legível e com inscrição ativa no conselho de SP.');
    cy.contains('Aprovado').should('be.visible');
    pausa(RITMO.leitura);

    entrar('/admin/validacao', sessaoAdminDemo());
    cy.get('[role="group"][aria-label="Filtrar por perfil"]').contains('button', 'Pacientes').click();
    cy.contains('.admin-dashboard__card-link', MARIANA.nome).click();
    cy.contains('h1', MARIANA.nome).should('be.visible');
    cy.button('Pré-validar todas as etapas').click();
    etapaAdmin('CPF').should('contain', 'Parecer favorável');
    pausa();
    decidir('CPF', 'Aprovar');
    decidir('Documento de identidade', 'Aprovar', 'RG conferido com a foto do documento enviado.');
    cy.contains('Aprovado').should('be.visible');
    pausa(RITMO.leitura);
  });
});
