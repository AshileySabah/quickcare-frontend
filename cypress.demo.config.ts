import { defineConfig } from 'cypress';

const LARGURA = 1920;
const ALTURA = 1080;

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/demo/cenas/**/*.cy.ts',
    supportFile: 'cypress/demo/support/demo.ts',
    fixturesFolder: false,
    viewportWidth: LARGURA,
    viewportHeight: ALTURA,
    scrollBehavior: 'center',
    video: true,
    videoCompression: false,
    videosFolder: 'cypress/videos/demo',
    screenshotsFolder: 'cypress/screenshots/demo',
    defaultCommandTimeout: 10000,
    retries: 0,
    env: { NO_COMMAND_LOG: 1 },
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args.push(`--window-size=${LARGURA + 16},${ALTURA + 96}`);
        }
        return launchOptions;
      });
    },
  },
});
