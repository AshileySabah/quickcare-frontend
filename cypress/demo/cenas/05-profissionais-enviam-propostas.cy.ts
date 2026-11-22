import { api, apiSequence } from '../../support/api';
import { localDateTime } from '../../support/factories';
import {
  CAMILA,
  DIEGO,
  Pessoa,
  RAFAEL,
  SOLICITACAO_ID,
  propostaDe,
  sessaoProfissionalDemo,
  solicitacaoParaProfissional,
} from '../support/elenco';
import { RITMO, entrar, legenda, pausa, quem } from '../support/estudio';

interface Envio {
  pessoa: Pessoa;
  descricao: string;
  valor: string;
  inicio: [number, number];
  termino: [number, number];
  abordagem: string;
}

const ENVIOS: Envio[] = [
  {
    pessoa: RAFAEL,
    descricao: 'Rafael Lima, enfermeiro',
    valor: '180',
    inicio: [3, 9],
    termino: [3, 11],
    abordagem: 'Faço o curativo com material estéril, avalio a cicatrização a cada visita e oriento sobre os cuidados com o joelho.',
  },
  {
    pessoa: CAMILA,
    descricao: 'Camila Rocha, cuidadora',
    valor: '220',
    inicio: [3, 8],
    termino: [3, 18],
    abordagem: 'Acompanho durante o dia, ajudo na locomoção, nos exercícios indicados e na organização dos remédios.',
  },
  {
    pessoa: DIEGO,
    descricao: 'Diego Alves, enfermeiro',
    valor: '150',
    inicio: [3, 10],
    termino: [3, 12],
    abordagem: 'Tenho experiência com curativos pós-operatórios e levo todo o material necessário.',
  },
];

function enviar(envio: Envio, detalhado: boolean) {
  const solicitacao = solicitacaoParaProfissional(envio.pessoa);
  api('GET', '/solicitacoes/disponiveis', [solicitacao]);
  api('GET', `/solicitacoes/${SOLICITACAO_ID}`, solicitacao);
  apiSequence('GET', `/solicitacoes/${SOLICITACAO_ID}/propostas`, [{ body: [] }, { body: [propostaDe(envio.pessoa)] }]);
  api('POST', `/solicitacoes/${SOLICITACAO_ID}/propostas`, propostaDe(envio.pessoa));

  quem(envio.descricao);
  entrar('/professional', sessaoProfissionalDemo(envio.pessoa));
  cy.contains('.professional-home__card-link', 'Fiz uma cirurgia no joelho').should('be.visible');
  pausa(detalhado ? RITMO.leitura : RITMO.respiro);
  cy.contains('.professional-home__card-link', 'Fiz uma cirurgia no joelho').click();
  cy.contains('h2', 'Enviar proposta').should('be.visible');
  pausa(detalhado ? RITMO.leitura : 600);

  cy.fillField('Preço (R$)', envio.valor);
  cy.field('Início do atendimento').type(localDateTime(...envio.inicio));
  cy.field('Término do atendimento').type(localDateTime(...envio.termino));
  cy.fillField('Abordagem', envio.abordagem);
  pausa(600);
  cy.button('Enviar proposta').click();
  cy.toast('Proposta enviada com sucesso!').should('be.visible');
  pausa(detalhado ? RITMO.leitura : RITMO.respiro);
}

describe('Cena 5 · Profissionais enviam propostas', () => {
  it('Rafael, Camila e Diego respondem à solicitação da Mariana', () => {
    legenda('Cena 5 · Profissionais enviam propostas', RAFAEL.nome);
    enviar(ENVIOS[0], true);
    enviar(ENVIOS[1], false);
    enviar(ENVIOS[2], false);
  });
});
