import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { ENV } from '../config/env';

export interface SuiteReportPaths {
  suiteDir: string;
  chartsDir: string;
  printsDir: string;
  jsonPath: string;
  mdPath: string;
}

export function initSuiteDirs(suiteFolder: string, mdFileName: string): SuiteReportPaths {
  const suiteDir = path.join(ENV.reportsDir, suiteFolder);
  const chartsDir = path.join(suiteDir, 'graficos');
  const printsDir = path.join(suiteDir, 'prints');

  fs.mkdirSync(chartsDir, { recursive: true });
  fs.mkdirSync(printsDir, { recursive: true });

  return {
    suiteDir,
    chartsDir,
    printsDir,
    jsonPath: path.join(suiteDir, 'resultado-execucao.json'),
    mdPath: path.join(suiteDir, mdFileName),
  };
}

export function saveJsonReport(jsonPath: string, data: unknown): void {
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function saveMarkdownReport(mdPath: string, markdown: string): void {
  fs.writeFileSync(mdPath, markdown, 'utf-8');
}

export function renderChart(chartSpec: Record<string, unknown>): void {
  const scriptPath = path.resolve(__dirname, 'chart-generator.py');
  const payload = JSON.stringify(chartSpec);
  execFileSync('python', [scriptPath, payload], {
    stdio: 'inherit',
    timeout: 30000,
  });
}

export function formatNowBr(): string {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
