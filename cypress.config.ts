import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    baseUrl: 'http://localhost:4200',
    
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',

    viewportWidth: 1280,
    viewportHeight: 720,

    defaultCommandTimeout: 6000,
    requestTimeout: 8000,
    pageLoadTimeout: 15000,

    video: false,
    screenshotOnRunFailure: true,

    retries: {
      runMode: 1,
      openMode: 0,
    },

    setupNodeEvents(on, config) {
      // Eventos do Cypress podem ser adicionados aqui futuramente.
      return config;
    },
  },
});
