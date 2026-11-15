import * as fs from 'node:fs';
import * as path from 'node:path';
import { Page, TestInfo } from '@playwright/test';

/**
 * Captura um print de evidência com nome padronizado dentro de `e2e/relatorios/<suiteSlug>/prints/`
 * e também o anexa ao relatório oficial HTML/JSON do Playwright.
 */
export async function captureEvidence(
  page: Page,
  testInfo: TestInfo,
  suiteSlug: string,
  fileName: string,
  description: string,
): Promise<string> {
  const printsDir = path.resolve(__dirname, '../../relatorios', suiteSlug, 'prints');
  fs.mkdirSync(printsDir, { recursive: true });

  const normalizedName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  const filePath = path.join(printsDir, normalizedName);

  await page.screenshot({ path: filePath, fullPage: false });

  await testInfo.attach(`${normalizedName} — ${description}`, {
    path: filePath,
    contentType: 'image/png',
  });

  return filePath;
}
