import * as path from 'node:path';
import { defineConfig, devices, ReporterDescription } from '@playwright/test';
import { envConfig } from './src/config/env';

const frontendRoot = path.resolve(__dirname, '..');
const customReportDir = process.env.E2E_REPORT_DIR?.trim();

const reporters: ReporterDescription[] = [['list']];
if (customReportDir) {
  reporters.push(['html', { outputFolder: path.join(customReportDir, 'html-report'), open: 'never' }]);
  reporters.push(['json', { outputFile: path.join(customReportDir, 'resultado-execucao.json') }]);
} else {
  reporters.push(['html', { outputFolder: 'playwright-report', open: 'never' }]);
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: envConfig.isRemote ? 90_000 : 60_000,
  expect: {
    timeout: envConfig.isRemote ? 20_000 : 10_000,
  },
  reporter: reporters,
  use: {
    baseURL: envConfig.baseUrl,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1366, height: 768 },
    actionTimeout: 15_000,
    navigationTimeout: envConfig.isRemote ? 45_000 : 30_000,
    launchOptions: {
      slowMo: Number(process.env.E2E_SLOW_MO ?? 0),
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: envConfig.videoMode,
  },
  projects: [
    {
      name: `chromium-${envConfig.target}`,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: envConfig.isLocal
    ? {
        command: 'npm start',
        cwd: frontendRoot,
        url: 'http://localhost:4200',
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
