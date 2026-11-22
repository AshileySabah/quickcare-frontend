import { route } from '../../support/api';
import { banimento, inDays } from '../../support/factories';
import { CAMILA, sessaoProfissionalDemo } from '../support/elenco';
import { RITMO, entrar, legenda, pausa } from '../support/estudio';

const MOTIVO = 'O print confirma a cobrança fora da plataforma. Suspensão de 30 dias.';
const RECURSO = 'Foi um mal-entendido: eu falava do material do curativo, que não estava incluso. Peço que revejam.';

describe('Cena 14 · O lado da banida', () => {
  it('Camila vê o aviso de suspensão e recorre', () => {
    let recurso: { status: string; texto: string; criadoEm: string } | undefined;
    const atual = () =>
      banimento({
        id: 950,
        perfil: 'PROFISSIONAL',
        fim: inDays(30),
        justificativa: MOTIVO,
        denunciaId: 600,
        podeRecorrer: !recurso,
        recurso,
      });
    cy.intercept(route('GET', '/banimentos'), (req) => req.reply({ banimento: atual() }));
    cy.intercept(route('POST', '/banimentos/950/recurso'), (req) => {
      recurso = { status: 'EM_ANALISE', texto: RECURSO, criadoEm: new Date().toISOString() };
      req.reply({ banimento: atual() });
    });

    entrar('/professional', sessaoProfissionalDemo(CAMILA, 'APROVADO', true));
    legenda('Cena 14 · O lado da banida', 'Camila Rocha, cuidadora');
    cy.get('.ban-notice').should('contain', 'Perfil banido').and('contain', `Motivo: ${MOTIVO}`);
    pausa(RITMO.leitura);
    pausa(RITMO.leitura);

    cy.get('.ban-notice').contains('button', 'Recorrer').click();
    cy.dialog('Recorrer do banimento').within(() => {
      cy.fillField('Por que o banimento deveria ser removido?', RECURSO);
      pausa();
      cy.button('Sim, enviar o recurso').click();
    });
    cy.toast('Recurso enviado.').should('be.visible');
    cy.get('.ban-notice').should('contain', 'Recurso enviado em');
    pausa(RITMO.leitura);
  });
});
