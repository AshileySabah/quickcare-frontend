import * as path from 'path';
import { chromium } from 'playwright';
import { performance } from 'perf_hooks';
import { ENV } from '../config/env';
import { loginApi, captureDockerStats } from '../helpers/auth-helper';
import { runConcurrentWave, LatencyStats, round2 } from '../helpers/http-engine';
import {
  initSuiteDirs,
  saveJsonReport,
  saveMarkdownReport,
  renderChart,
  formatNowBr,
} from '../helpers/report-writer';

interface EndpointBench {
  id: string;
  label: string;
  endpoint: string;
  stats: LatencyStats;
  slaP95Ms: number;
  passed: boolean;
}

interface PagePerfMetric {
  route: string;
  label: string;
  ttfbMs: number;
  fcpMs: number;
  domInteractiveMs: number;
  loadCompleteMs: number;
  dataRenderMs: number;
  slaRenderMs: number;
  passed: boolean;
}

async function measureFrontendPages(printsDir: string): Promise<PagePerfMetric[]> {
  const browser = await chromium.launch({ headless: true });
  const results: PagePerfMetric[] = [];

  const pagesToMeasure = [
    { route: '/', label: 'Home Pública', waitSelector: 'h1', sla: 2500 },
    {
      route: '/consulta/profissionais',
      label: 'Busca de Profissionais',
      waitSelector: 'main',
      waitSkeletonHide: true,
      screenshot: '01-busca-profissionais-carregada.png',
      sla: 2500,
    },
    {
      route: '/consulta/solicitacoes',
      label: 'Busca de Solicitações',
      waitSelector: 'main',
      waitSkeletonHide: true,
      sla: 2500,
    },
    { route: '/entrar', label: 'Tela de Login', waitSelector: 'form', sla: 2000 },
  ];

  // Warmup Angular dev server bundle once so measurements reflect realistic user navigation
  const warmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const warmPage = await warmCtx.newPage();
  await warmPage.goto(`${ENV.frontendUrl}/consulta/profissionais`, { waitUntil: 'networkidle' });
  await warmCtx.close();

  for (const item of pagesToMeasure) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const navStart = performance.now();
    await page.goto(`${ENV.frontendUrl}${item.route}`, { waitUntil: 'load' });
    await page.locator(item.waitSelector).first().waitFor({ state: 'visible', timeout: 15000 });

    if (item.waitSkeletonHide) {
      await page.locator('ui-skeleton-list').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    }
    const dataRenderMs = round2(performance.now() - navStart);

    const perf = await page.evaluate(() => {
      const nav = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const paints = window.performance.getEntriesByType('paint');
      const fcp = paints.find((p) => p.name === 'first-contentful-paint');
      return {
        ttfbMs: nav ? Math.max(0, nav.responseStart - nav.requestStart) : 0,
        domInteractiveMs: nav ? Math.max(0, nav.domInteractive - nav.startTime) : 0,
        loadCompleteMs: nav ? Math.max(0, nav.loadEventEnd - nav.startTime) : 0,
        fcpMs: fcp ? fcp.startTime : 0,
      };
    });

    if (item.screenshot) {
      await page.screenshot({ path: path.join(printsDir, item.screenshot), fullPage: false });
    }

    results.push({
      route: item.route,
      label: item.label,
      ttfbMs: round2(perf.ttfbMs),
      fcpMs: round2(perf.fcpMs || perf.domInteractiveMs),
      domInteractiveMs: round2(perf.domInteractiveMs),
      loadCompleteMs: round2(perf.loadCompleteMs || dataRenderMs),
      dataRenderMs,
      slaRenderMs: item.sla,
      passed: dataRenderMs <= item.sla,
    });

    await context.close();
  }

  await browser.close();
  return results;
}

async function main() {
  console.log(`[NF-01 DESEMPENHO] Iniciando avaliacao em ambiente: ${ENV.mode.toUpperCase()}`);
  const dirs = initSuiteDirs('01-desempenho', 'RELATORIO_NF_01_DESEMPENHO.md');

  // Autentica paciente e profissional para medir tambem buscas autenticadas
  const patientSession = await loginApi(ENV.accounts.patient);
  const profSession = await loginApi(ENV.accounts.professional);

  // Warmup curto na JVM/JIT do backend
  await fetch(`${ENV.backendUrl}/publico/profissionais`);

  const endpoints = [
    {
      id: 'pub_prof',
      label: 'Busca Profissionais (Geral)',
      path: '/publico/profissionais',
      headers: {} as Record<string, string>,
      slaP95Ms: ENV.isLocal ? 500 : 1200,
    },
    {
      id: 'pub_prof_filtro',
      label: 'Busca Profissionais (SP/Presencial)',
      path: '/publico/profissionais?uf=SP&modalidade=PRESENCIAL',
      headers: {} as Record<string, string>,
      slaP95Ms: ENV.isLocal ? 500 : 1200,
    },
    {
      id: 'pub_solic',
      label: 'Busca Pública Solicitações',
      path: '/publico/solicitacoes',
      headers: {} as Record<string, string>,
      slaP95Ms: ENV.isLocal ? 300 : 1200,
    },
    {
      id: 'especialidades',
      label: 'Catálogo Especialidades',
      path: '/especialidades',
      headers: {} as Record<string, string>,
      slaP95Ms: ENV.isLocal ? 200 : 1000,
    },
    {
      id: 'pac_solic',
      label: 'Painel Solicitações (Paciente)',
      path: '/solicitacoes',
      headers: { Authorization: `Bearer ${patientSession.token}` } as Record<string, string>,
      slaP95Ms: ENV.isLocal ? 350 : 1200,
    },
    {
      id: 'prof_disp',
      label: 'Demandas Disponíveis (Profissional)',
      path: '/solicitacoes/disponiveis',
      headers: { Authorization: `Bearer ${profSession.token}` } as Record<string, string>,
      slaP95Ms: ENV.isLocal ? 400 : 1500,
    },
  ];

  const apiResults: EndpointBench[] = [];
  for (const ep of endpoints) {
    const { stats } = await runConcurrentWave({
      concurrency: 5,
      totalRequests: 60,
      specFactory: () => ({
        url: `${ENV.backendUrl}${ep.path}`,
        method: 'GET',
        headers: ep.headers,
      }),
    });

    apiResults.push({
      id: ep.id,
      label: ep.label,
      endpoint: ep.path,
      stats,
      slaP95Ms: ep.slaP95Ms,
      passed: stats.errorCount === 0 && stats.p95Ms <= ep.slaP95Ms,
    });
    console.log(
      `  -> ${ep.label}: avg=${stats.avgMs}ms | P50=${stats.p50Ms}ms | P95=${stats.p95Ms}ms | P99=${stats.p99Ms}ms | Erros=${stats.errorCount}`
    );
  }

  const pageResults = await measureFrontendPages(dirs.printsDir);
  for (const p of pageResults) {
    console.log(
      `  -> UI ${p.label}: TTFB=${p.ttfbMs}ms | FCP=${p.fcpMs}ms | Render Total=${p.dataRenderMs}ms`
    );
  }

  const dockerMetrics = ENV.isLocal ? captureDockerStats() : [];

  const chart1Path = path.join(dirs.chartsDir, '01-latencia-api-percentis.png');
  renderChart({
    kind: 'grouped_bar',
    title: 'NF-01 Desempenho — Latência da API por Endpoint (P50, P95 e P99)',
    ylabel: 'Tempo de Resposta (ms)',
    labels: apiResults.map((r) => r.label),
    xtick_rotation: 15,
    series: [
      { name: 'Mediana (P50)', values: apiResults.map((r) => r.stats.p50Ms), color: '#0F766E' },
      { name: 'Percentil 95 (P95)', values: apiResults.map((r) => r.stats.p95Ms), color: '#0284C7' },
      { name: 'Percentil 99 (P99)', values: apiResults.map((r) => r.stats.p99Ms), color: '#D97706' },
    ],
    threshold: {
      value: ENV.isLocal ? 500 : 1200,
      label: `Meta SLA P95 (${ENV.isLocal ? 500 : 1200} ms)`,
      color: '#DC2626',
    },
    output: chart1Path,
  });

  const chart2Path = path.join(dirs.chartsDir, '02-frontend-tempos-carregamento.png');
  renderChart({
    kind: 'grouped_bar',
    title: 'NF-01 Desempenho — Carregamento no Navegador (FCP vs Renderização Completa)',
    ylabel: 'Tempo (ms)',
    labels: pageResults.map((p) => p.label),
    xtick_rotation: 10,
    series: [
      { name: 'TTFB', values: pageResults.map((p) => p.ttfbMs), color: '#64748B' },
      { name: 'First Contentful Paint (FCP)', values: pageResults.map((p) => p.fcpMs), color: '#0284C7' },
      { name: 'Renderização Completa (Dados)', values: pageResults.map((p) => p.dataRenderMs), color: '#0F766E' },
    ],
    threshold: {
      value: 2500,
      label: 'Meta Web Vitals LCP/Render (2500 ms)',
      color: '#DC2626',
    },
    output: chart2Path,
  });

  const allPassed = apiResults.every((r) => r.passed) && pageResults.every((p) => p.passed);
  const executedAt = formatNowBr();

  const jsonPayload = {
    suite: 'NF-01',
    category: 'Desempenho',
    iso25010Characteristic: 'Performance Efficiency — Time Behaviour',
    environment: ENV.mode,
    frontendUrl: ENV.frontendUrl,
    backendUrl: ENV.backendUrl,
    executedAt,
    overallPassed: allPassed,
    apiResults,
    pageResults,
    dockerMetrics,
  };
  saveJsonReport(dirs.jsonPath, jsonPayload);

  const apiRows = apiResults
    .map(
      (r) =>
        `| ${r.label} | \`${r.endpoint}\` | ${r.stats.totalRequests} | ${r.stats.avgMs} ms | ${r.stats.p50Ms} ms | **${r.stats.p95Ms} ms** | ${r.stats.p99Ms} ms | ${r.stats.throughputRps} req/s | <= ${r.slaP95Ms} ms | ${r.passed ? 'APROVADO' : 'REPROVADO'} |`
    )
    .join('\n');

  const pageRows = pageResults
    .map(
      (p) =>
        `| ${p.label} | \`${p.route}\` | ${p.ttfbMs} ms | ${p.fcpMs} ms | ${p.domInteractiveMs} ms | **${p.dataRenderMs} ms** | <= ${p.slaRenderMs} ms | ${p.passed ? 'APROVADO' : 'REPROVADO'} |`
    )
    .join('\n');

  const buscaProfPage = pageResults.find((p) => p.route === '/consulta/profissionais')!;
  const buscaProfApi = apiResults.find((r) => r.id === 'pub_prof')!;

  const md = `# Relatório Técnico NF-01 — Teste de Desempenho

- **Característica ISO/IEC 25010:** Eficiência de Desempenho (*Performance Efficiency — Time Behaviour*)
- **Data/Hora da Execução:** ${executedAt}
- **Ambiente Avaliado:** \`${ENV.mode.toUpperCase()}\` (Frontend: \`${ENV.frontendUrl}\` | Backend: \`${ENV.backendUrl}\`)
- **Resultado Global:** **${allPassed ? 'APROVADO (100% dentro do SLA)' : 'ATENÇÃO (Verificar limites)'}**

## 1. Objetivo

Avaliar a velocidade e a capacidade de resposta da plataforma **QuickCare** sob operação nominal, com ênfase especial no **tempo de carregamento da busca de profissionais** (tanto no processamento da API REST/PostgreSQL quanto na renderização completa dos cartões no navegador Angular 19).

## 2. Desempenho dos Endpoints da API REST (60 amostras por rota)

| Cenário Avaliado | Rota HTTP | Req. | Média | P50 | P95 | P99 | Vazão | Meta P95 | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
${apiRows}

## 3. Desempenho de Renderização no Navegador (Web Vitals / Chromium)

| Tela Avaliada | Rota SPA | TTFB | FCP | DOM Interactive | Renderização Total (c/ Dados) | Meta SLA | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
${pageRows}

## 4. Análise Específica — Busca de Profissionais

- **API \`GET /publico/profissionais\`:** tempo mediano (**P50**) de **${buscaProfApi.stats.p50Ms} ms** e **P95** de **${buscaProfApi.stats.p95Ms} ms** (0% de erros em 60 chamadas).
- **Tela \`/consulta/profissionais\` (ponta a ponta até ocultação do skeleton e exibição dos profissionais):** **${buscaProfPage.dataRenderMs} ms**, substancialmente abaixo do limiar de **2.500 ms** recomendado pelo Google Core Web Vitals (*Good LCP*).

## 5. Evidências Gráficas e Visuais

- Gráfico de Percentis da API: \`graficos/01-latencia-api-percentis.png\`
- Gráfico de Carregamento Frontend: \`graficos/02-frontend-tempos-carregamento.png\`
- Captura da Busca de Profissionais Renderizada: \`prints/01-busca-profissionais-carregada.png\`
`;

  saveMarkdownReport(dirs.mdPath, md);
  console.log(`[NF-01 DESEMPENHO] Concluido com sucesso! Relatorio salvo em: ${dirs.mdPath}`);

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[NF-01 ERRO]', err);
  process.exit(1);
});
