import '../../support/commands';
import './estudio';
import { stubDefaults } from '../../support/api';
import { ENDERECO_MARIANA } from './elenco';
import { pausa } from './estudio';

Cypress.on('uncaught:exception', (error) => !error.message.includes('ResizeObserver loop'));

beforeEach(() => {
  stubDefaults();
  cy.intercept(
    { hostname: 'viacep.com.br' },
    {
      statusCode: 200,
      body: {
        cep: '04538-133',
        logradouro: ENDERECO_MARIANA.logradouro,
        bairro: ENDERECO_MARIANA.bairro,
        localidade: ENDERECO_MARIANA.cidade,
        uf: ENDERECO_MARIANA.uf,
      },
    },
  );
});

afterEach(() => {
  pausa(3500);
});
