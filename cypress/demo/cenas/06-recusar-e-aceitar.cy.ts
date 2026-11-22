import { api, route } from '../../support/api';
import {
  CAMILA,
  DIEGO,
  Pessoa,
  RAFAEL,
  SOLICITACAO_ID,
  atendimentoDe,
  avisoPara,
  idProposta,
  perfilProfissionalDe,
  propostaDe,
  sessaoPacienteDemo,
  solicitacaoMariana,
  vagas,
} from '../support/elenco';
import { RITMO, entrar, legenda, notificacaoAoVivo, pausa } from '../support/estudio';

const LINK = `/patient/solicitacoes/${SOLICITACAO_ID}`;
const cartao = (pessoa: Pessoa) => cy.contains('ui-proposal-card', pessoa.nome);

function avisoDeProposta(pessoa: Pessoa) {
  return avisoPara('PACIENTE', 'PROPOSTA_RECEBIDA', 'Nova proposta', `${pessoa.nome} enviou uma proposta para sua solicitação.`, LINK);
}

describe('Cena 6 · Recusar e aceitar propostas', () => {
  it('Mariana compara, recusa a do Diego e aceita Rafael e Camila', () => {
    const status: Record<number, string> = { [RAFAEL.usuarioId]: 'PENDENTE', [CAMILA.usuarioId]: 'PENDENTE', [DIEGO.usuarioId]: 'PENDENTE' };
    const aceita = (pessoa: Pessoa) => status[pessoa.usuarioId] === 'ACEITA';
    const propostaAtual = (pessoa: Pessoa) =>
      propostaDe(pessoa, {
        status: status[pessoa.usuarioId],
        atendimento: aceita(pessoa) ? atendimentoDe(pessoa) : undefined,
      });
    const solicitacaoAtual = () =>
      solicitacaoMariana({
        totalPropostas: 3,
        status: aceita(RAFAEL) && aceita(CAMILA) ? 'EM_ANDAMENTO' : 'RECEBENDO_PROPOSTAS',
        profissionais: vagas(aceita(RAFAEL), aceita(CAMILA)),
      });

    const avisos = [avisoDeProposta(RAFAEL), avisoDeProposta(CAMILA)];
    const avisoDiego = avisoDeProposta(DIEGO);
    cy.intercept(route('GET', '/notificacoes'), (req) => req.reply([...avisos].reverse()));
    cy.intercept(route('GET', '/notificacoes/nao-lidas'), (req) => req.reply({ paciente: avisos.length, profissional: 0 }));
    cy.intercept(route('PATCH', /^\/notificacoes\/\d+\/lida$/), (req) => req.reply({ ...avisoDiego, lida: true }));
    cy.intercept(route('GET', '/solicitacoes'), (req) => req.reply([solicitacaoAtual()]));
    cy.intercept(route('GET', `/solicitacoes/${SOLICITACAO_ID}`), (req) => req.reply(solicitacaoAtual()));
    cy.intercept(route('GET', `/solicitacoes/${SOLICITACAO_ID}/propostas`), (req) =>
      req.reply([RAFAEL, CAMILA, DIEGO].map(propostaAtual)),
    );
    [RAFAEL, CAMILA, DIEGO].forEach((pessoa) => {
      cy.intercept(route('PATCH', `/propostas/${idProposta(pessoa)}/aceitar`), (req) => {
        status[pessoa.usuarioId] = 'ACEITA';
        req.reply(propostaAtual(pessoa));
      });
      cy.intercept(route('PATCH', `/propostas/${idProposta(pessoa)}/recusar`), (req) => {
        status[pessoa.usuarioId] = 'RECUSADA';
        req.reply(propostaAtual(pessoa));
      });
      api('GET', `/profissionais/${pessoa.usuarioId}/perfil`, perfilProfissionalDe(pessoa));
    });

    entrar('/patient', sessaoPacienteDemo());
    legenda('Cena 6 · Recusar e aceitar propostas', 'Mariana Souza, paciente');
    cy.get('.notification-bell__badge').should('contain', '2');
    pausa();
    cy.then(() => avisos.push(avisoDiego));
    notificacaoAoVivo(avisoDiego);
    cy.get('.notification-bell__badge').should('contain', '3');
    pausa(RITMO.leitura);

    cy.get('.notification-bell__trigger').click();
    pausa();
    cy.contains('.notification-bell__item', DIEGO.nome).click();
    cy.location('pathname').should('eq', LINK);
    cy.get('ui-proposal-card').should('have.length', 3);
    pausa(RITMO.leitura);

    cy.get(`[aria-label="Opções para ${DIEGO.nome}"]`).click();
    cy.contains('[role="menuitem"]', 'Ver perfil').click();
    cy.contains('h1', DIEGO.nome).should('be.visible');
    pausa(RITMO.leitura);
    cy.go('back');
    cy.get('ui-proposal-card').should('have.length', 3);
    pausa();

    cartao(DIEGO).contains('button', 'Recusar').click();
    cy.dialog('Recusar proposta').within(() => {
      pausa();
      cy.button('Sim, recusar a proposta').click();
    });
    cy.toast('Proposta recusada.').should('be.visible');
    pausa();

    cartao(RAFAEL).contains('button', 'Aceitar proposta').click();
    cy.dialog('Aceitar proposta').within(() => {
      pausa();
      cy.button('Sim, aceitar a proposta').click();
    });
    cy.toast('Proposta aceita!').should('be.visible');
    pausa();

    cartao(CAMILA).contains('button', 'Aceitar proposta').click();
    cy.dialog('Aceitar proposta').within(() => {
      pausa(600);
      cy.button('Sim, aceitar a proposta').click();
    });
    cy.toast('Proposta aceita!').should('be.visible');
    pausa(RITMO.leitura);
  });
});
