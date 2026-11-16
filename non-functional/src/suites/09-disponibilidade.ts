import * as path from 'path';
import { performance } from 'perf_hooks';
import { ENV } from '../config/env';
import { round2 } from '../helpers/http-engine';
import {
  initSuiteDirs,
  saveJsonReport,
  saveMarkdownReport,
  renderChart,
  formatNowBr,
} from '../helpers/report-writer';

interface TargetSliResult {
  name: string;
  url: string;
  probesTotal: number;
  probesUp: number;
  availabilityPct: number;
  firstProbeColdMs: number;
  warmAvgMs: number;
  componentsUp: string[];
}

async function probeTarget(name: string, url: string, count: number, expectActuatorJson = false): Promise<TargetSliResult> {
  let probesUp = 0;
  let firstMs = 0;
  const warmLatencies: number[] = [];
  let componentsUp: string[] = [];

  for (let i = 0; i < count; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(url);
      const ms = round2(performance.now() - t0);
      let ok = res.status >= 200 && res.status < 400;

      if (expectActuatorJson && ok) {
        const body: any = await res.json();
        ok = body?.status === 'UP';
        if (i === 0 && body?.components) {
          componentsUp = Object.entries(body.components)
            .filter(([, v]: any) => v?.status === 'UP')
            .map(([k]) => k);
        }
      } else {
        await res.arrayBuffer();
      }

      if (ok) probesUp++;
      if (i === 0) firstMs = ms;
      else warmLatencies.push(ms);
    } catch {
      const ms = round2(performance.now() - t0);
      if (i === 0) firstMs = ms;
      else warmLatencies.push(ms);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const warmAvgMs =
    warmLatencies.length > 0
      ? round2(warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length)
      : firstMs;

  return {
    name,
    url,
    probesTotal: count,
    probesUp,
    availabilityPct: round2((probesUp / count) * 100),
    firstProbeColdMs: firstMs,
    warmAvgMs,
    componentsUp,
  };
}

async function main() {
  console.log(`[NF-09 DISPONIBILIDADE] Iniciando afericao de Uptime SLI/SLO em ambiente: ${ENV.mode.toUpperCase()}`);
  const dirs = initSuiteDirs('09-disponibilidade', 'RELATORIO_NF_09_DISPONIBILIDADE.md');

  const probeCount = ENV.isLocal ? 30 : 12;

  const targets = [
    {
      name: 'Actuator Health (Geral + DB)',
      url: `${ENV.backendUrl}/actuator/health`,
      actuator: true,
    },
    {
      name: 'Probe Liveness (Kubernetes/Container)',
      url: `${ENV.backendUrl}/actuator/health/liveness`,
      actuator: true,
    },
    {
      name: 'Probe Readiness (Tráfego Pronto)',
      url: `${ENV.backendUrl}/actuator/health/readiness`,
      actuator: true,
    },
    {
      name: 'API Busca de Profissionais',
      url: `${ENV.backendUrl}/publico/profissionais`,
      actuator: false,
    },
    {
      name: 'Frontend Web App (SPA)',
      url: `${ENV.frontendUrl}/`,
      actuator: false,
    },
  ];

  const results: TargetSliResult[] = [];
  for (const t of targets) {
    const res = await probeTarget(t.name, t.url, probeCount, t.actuator);
    results.push(res);
    console.log(
      `  -> ${res.name}: Disponibilidade=${res.availabilityPct}% (${res.probesUp}/${res.probesTotal}) | 1a Sonda=${res.firstProbeColdMs}ms | Media Warm=${res.warmAvgMs}ms`
    );
  }

  renderChart({
    kind: 'grouped_bar',
    title: 'NF-09 Disponibilidade — SLI de Uptime (%) e Tempo de Resposta das Sondas',
    ylabel: 'Disponibilidade (%) / Latência Warm (ms)',
    labels: results.map((r) => r.name),
    xtick_rotation: 12,
    series: [
      {
        name: 'Disponibilidade SLI (%)',
        values: results.map((r) => r.availabilityPct),
        color: '#16A34A',
      },
      {
        name: 'Latência Média Warm (ms)',
        values: results.map((r) => r.warmAvgMs),
        color: '#0284C7',
      },
    ],
    threshold: {
      value: 99.5,
      label: 'Meta SLO Disponibilidade (99,5%)',
      color: '#DC2626',
    },
    output: path.join(dirs.chartsDir, '01-disponibilidade-sli-slo.png'),
  });

  const globalSliPct = round2(
    results.reduce((acc, r) => acc + r.availabilityPct, 0) / results.length
  );
  const overallPassed = globalSliPct >= 99.5;
  const executedAt = formatNowBr();
  const internalComponents = results[0].componentsUp;

  saveJsonReport(dirs.jsonPath, {
    suite: 'NF-09',
    category: 'Disponibilidade',
    iso25010Characteristic: 'Reliability — Availability (SLI/SLO & Health Probes)',
    environment: ENV.mode,
    executedAt,
    sloTargetPct: 99.5,
    globalAvailabilitySliPct: globalSliPct,
    healthyInternalComponents: internalComponents,
    overallPassed,
    results,
  });

  const rows = results
    .map(
      (r) =>
        `| ${r.name} | \`${r.url}\` | ${r.probesUp}/${r.probesTotal} | **${r.availabilityPct}%** | ${r.firstProbeColdMs} ms | ${r.warmAvgMs} ms | **${r.availabilityPct >= 99.5 ? 'DENTRO DO SLO' : 'ABAIXO DO SLO'}** |`
    )
    .join('\n');

  const md = `# Relatório Técnico NF-09 — Teste de Disponibilidade (SLI, SLO e Sondas de Saúde)

- **Característica ISO/IEC 25010:** Confiabilidade — Disponibilidade (*Reliability — Availability*)
- **Data/Hora da Execução:** ${executedAt}
- **Ambiente Avaliado:** \`${ENV.mode.toUpperCase()}\`
- **SLI Global Aferido:** **${globalSliPct}%** (Meta SLO >= 99,5%) — **${overallPassed ? 'APROVADO' : 'REPROVADO'}**

## 1. Objetivo

Verificar a prontidão operacional contínua (*Availability*) dos subsistemas que compõem a arquitetura do **QuickCare** (aplicação web Angular, API Spring Boot, sondas *Liveness*/*Readiness* e conectividade ativa com PostgreSQL/PostGIS e disco), aferindo o *Service Level Indicator* (**SLI**) frente ao *Service Level Objective* (**SLO >= 99,5%**).

## 2. Matriz de Sondas Sintéticas Contínuas (${probeCount} ciclos por componente)

| Subsistemas / Sondas | URL Monitorada | Sucesso | SLI Disponibilidade | 1ª Sonda (Cold) | Média Estável (Warm) | Status SLO |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
${rows}

## 3. Subsistemas Internos Auditados via Spring Boot Actuator

- **Componentes reportando estado \`UP\`:** \`${internalComponents.length > 0 ? internalComponents.join(', ') : 'status geral UP'}\`.

## 4. Evidência Gráfica

- Indicador SLI de Disponibilidade vs Meta SLO: \`graficos/01-disponibilidade-sli-slo.png\`
`;

  saveMarkdownReport(dirs.mdPath, md);
  console.log(`[NF-09 DISPONIBILIDADE] Concluido (SLI Global=${globalSliPct}%)! Relatorio salvo em: ${dirs.mdPath}`);
  if (!overallPassed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[NF-09 ERRO]', err);
  process.exit(1);
});
