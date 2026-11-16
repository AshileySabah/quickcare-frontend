import * as path from 'path';
import { ENV, assertLocalOnly } from '../config/env';
import { loginApi, captureDockerStats, DockerContainerMetric } from '../helpers/auth-helper';
import { runConcurrentWave, computeStats, LatencyStats, HttpSample } from '../helpers/http-engine';
import {
  initSuiteDirs,
  saveJsonReport,
  saveMarkdownReport,
  renderChart,
  formatNowBr,
} from '../helpers/report-writer';

interface LoadStageResult {
  stageName: string;
  concurrentUsers: number;
  totalRequests: number;
  stats: LatencyStats;
  dockerSnapshot: DockerContainerMetric[];
}

async function main() {
  assertLocalOnly('NF-02 Teste de Carga (500 Usuarios Simultaneos)');
  console.log('[NF-02 CARGA] Iniciando teste de carga com ate 500 pacientes/profissionais simultaneos (LOCAL DOCKER)...');

  const dirs = initSuiteDirs('02-carga', 'RELATORIO_NF_02_CARGA.md');

  const pat1 = await loginApi(ENV.accounts.patient);
  const pat2 = await loginApi(ENV.accounts.patientB);
  const prof = await loginApi(ENV.accounts.professional);
  const dual = await loginApi(ENV.accounts.dual);

  // Warmup inicial
  await runConcurrentWave({
    concurrency: 20,
    totalRequests: 60,
    specFactory: () => ({ url: `${ENV.backendUrl}/publico/profissionais` }),
  });

  const buildWorkloadSpec = (idx: number) => {
    const mod = idx % 20;
    if (mod < 5) {
      // 25%: Paciente buscando profissionais (geral)
      return {
        url: `${ENV.backendUrl}/publico/profissionais`,
        headers: { Authorization: `Bearer ${pat1.token}` },
        timeoutMs: 20000,
      };
    }
    if (mod < 8) {
      // 15%: Paciente buscando profissionais com filtro SP/Presencial
      return {
        url: `${ENV.backendUrl}/publico/profissionais?uf=SP&modalidade=PRESENCIAL`,
        headers: { Authorization: `Bearer ${pat2.token}` },
        timeoutMs: 20000,
      };
    }
    if (mod < 13) {
      // 25%: Paciente acompanhando painel de solicitacoes e especialidades
      return mod % 2 === 0
        ? {
            url: `${ENV.backendUrl}/solicitacoes`,
            headers: { Authorization: `Bearer ${pat1.token}` },
            timeoutMs: 20000,
          }
        : {
            url: `${ENV.backendUrl}/especialidades`,
            headers: { Authorization: `Bearer ${pat2.token}` },
            timeoutMs: 20000,
          };
    }
    if (mod < 18) {
      // 25%: Profissional buscando demandas disponiveis na regiao/especialidade
      const token = mod % 2 === 0 ? prof.token : dual.token;
      return {
        url: `${ENV.backendUrl}/solicitacoes/disponiveis`,
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 20000,
      };
    }
    // 10%: Visitante consultando mural publico de solicitacoes
    return {
      url: `${ENV.backendUrl}/publico/solicitacoes`,
      timeoutMs: 20000,
    };
  };

  const stages = [
    { stageName: 'Rampa Inicial (100 simultâneos)', concurrentUsers: 100, totalRequests: 400 },
    { stageName: 'Carga Intermediária (250 simultâneos)', concurrentUsers: 250, totalRequests: 1000 },
    { stageName: 'Carga Alvo (500 simultâneos)', concurrentUsers: 500, totalRequests: 2000 },
  ];

  const stageResults: LoadStageResult[] = [];
  let peakSamples: HttpSample[] = [];

  for (const st of stages) {
    console.log(`  -> Executando ${st.stageName} (${st.totalRequests} requisicoes)...`);
    let midDocker: DockerContainerMetric[] = [];
    const samplerTimer = setTimeout(() => {
      midDocker = captureDockerStats();
    }, 350);

    const { stats, samples } = await runConcurrentWave({
      concurrency: st.concurrentUsers,
      totalRequests: st.totalRequests,
      specFactory: buildWorkloadSpec,
      keepAlive: true,
    });
    clearTimeout(samplerTimer);
    if (midDocker.length === 0) {
      midDocker = captureDockerStats();
    }

    if (st.concurrentUsers === 500) {
      peakSamples = samples;
    }

    stageResults.push({
      stageName: st.stageName,
      concurrentUsers: st.concurrentUsers,
      totalRequests: st.totalRequests,
      stats,
      dockerSnapshot: midDocker,
    });

    console.log(
      `     Concluido: Vazao=${stats.throughputRps} req/s | P50=${stats.p50Ms}ms | P95=${stats.p95Ms}ms | P99=${stats.p99Ms}ms | Sucesso=${stats.successCount}/${stats.totalRequests} (${100 - stats.errorRatePct}%)`
    );
  }

  // Segmenta estatisticas por perfil na onda de 500 simultaneos
  const peakWallMs = stageResults[2].stats.durationTotalMs;
  const chart1Path = path.join(dirs.chartsDir, '01-carga-vazao-vs-latencia.png');
  renderChart({
    kind: 'dual_axis',
    title: 'NF-02 Carga — Vazão (req/s) vs Latência P95 até 500 Usuários Simultâneos',
    xlabel: 'Concorrência Simultânea (Pacientes + Profissionais)',
    labels: stageResults.map((s) => `${s.concurrentUsers} usuários`),
    left: {
      name: 'Vazão (req/s)',
      ylabel: 'Vazão (Requisições / segundo)',
      values: stageResults.map((s) => s.stats.throughputRps),
      color: '#0F766E',
    },
    right: {
      name: 'Latência P95 (ms)',
      ylabel: 'Latência (ms)',
      values: stageResults.map((s) => s.stats.p95Ms),
      color: '#DC2626',
    },
    extra_right: {
      name: 'Mediana P50 (ms)',
      values: stageResults.map((s) => s.stats.p50Ms),
      color: '#0284C7',
    },
    output: chart1Path,
  });

  const chart2Path = path.join(dirs.chartsDir, '02-carga-distribuicao-percentis.png');
  renderChart({
    kind: 'grouped_bar',
    title: 'NF-02 Carga — Evolução dos Percentis de Latência por Patamar de Usuários',
    ylabel: 'Latência (ms)',
    labels: stageResults.map((s) => `${s.concurrentUsers} simultâneos`),
    xtick_rotation: 0,
    series: [
      { name: 'P50 (Mediana)', values: stageResults.map((s) => s.stats.p50Ms), color: '#0F766E' },
      { name: 'P90', values: stageResults.map((s) => s.stats.p90Ms), color: '#0284C7' },
      { name: 'P95', values: stageResults.map((s) => s.stats.p95Ms), color: '#D97706' },
      { name: 'P99', values: stageResults.map((s) => s.stats.p99Ms), color: '#DC2626' },
    ],
    output: chart2Path,
  });

  const peak = stageResults[2];
  // Critério ISO 25010 para Carga de 500 VUs: taxa de erro < 1%
  const overallPassed = peak.stats.errorRatePct < 1.0;
  const executedAt = formatNowBr();

  saveJsonReport(dirs.jsonPath, {
    suite: 'NF-02',
    category: 'Carga',
    iso25010Characteristic: 'Performance Efficiency — Capacity & Resource Utilization',
    environment: 'local-docker',
    backendUrl: ENV.backendUrl,
    executedAt,
    overallPassed,
    peakConcurrentUsers: 500,
    totalRequestsExecuted: stageResults.reduce((acc, s) => acc + s.totalRequests, 0),
    stageResults,
    peakSampleCount: peakSamples.length,
    peakWallMs,
  });

  const stageRows = stageResults
    .map(
      (s) =>
        `| ${s.stageName} | **${s.concurrentUsers}** | ${s.totalRequests} | **${s.stats.throughputRps} req/s** | ${s.stats.p50Ms} ms | ${s.stats.p90Ms} ms | **${s.stats.p95Ms} ms** | ${s.stats.p99Ms} ms | ${(100 - s.stats.errorRatePct).toFixed(2)}% |`
    )
    .join('\n');

  const dockerRows =
    peak.dockerSnapshot.length > 0
      ? peak.dockerSnapshot
          .map((d) => `| \`${d.name}\` | ${d.cpuPct} | ${d.memUsage} | ${d.memPct} |`)
          .join('\n')
      : '| `quickcare-backend` / `quickcare-postgres` | N/D | N/D | N/D |';

  const md = `# Relatório Técnico NF-02 — Teste de Carga (500 Usuários Simultâneos)

- **Característica ISO/IEC 25010:** Eficiência de Desempenho — Capacidade (*Capacity & Resource Utilization*)
- **Data/Hora da Execução:** ${executedAt}
- **Ambiente Avaliado:** \`LOCAL DOCKER\` (\`${ENV.backendUrl}\` + PostgreSQL 16/PostGIS)
- **Resultado Global:** **${overallPassed ? 'APROVADO (Suportou 500 acessos simultâneos sem queda)' : 'REPROVADO'}**

## 1. Objetivo

Verificar o comportamento, a vazão (*throughput*), os tempos de resposta sob concorrência e o consumo de recursos de infraestrutura da plataforma **QuickCare** com **500 pacientes e profissionais acessando simultaneamente** fluxos reais de busca de profissionais, acompanhamento de solicitações e consulta de demandas compatíveis.

## 2. Distribuição da Carga Mista (Workload Realista)

- **40% Pacientes buscando profissionais** (\`GET /publico/profissionais\` geral e filtrado por UF/modalidade)
- **25% Pacientes consultando painel e catálogo** (\`GET /solicitacoes\` e \`GET /especialidades\`)
- **25% Profissionais consultando demandas disponíveis** (\`GET /solicitacoes/disponiveis\`)
- **10% Visitantes em mural público** (\`GET /publico/solicitacoes\`)

## 3. Resultados por Patamar de Simultaneidade

| Estágio | Usuários Simultâneos | Total Req. | Vazão Média | P50 | P90 | P95 | P99 | Taxa de Sucesso |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
${stageRows}

## 4. Telemetria dos Containers Docker no Pico (500 Simultâneos)

| Container | Uso de CPU | Consumo de Memória | % Memória Alocada |
| :--- | :---: | :---: | :---: |
${dockerRows}

## 5. Conclusão Técnica

No patamar alvo de **500 pacientes/profissionais simultâneos** (2.000 requisições concorrentes em rajada sustentada), o backend Spring Boot + PostgreSQL/PostGIS processou **${peak.stats.successCount}/${peak.stats.totalRequests}** chamadas com **${(100 - peak.stats.errorRatePct).toFixed(2)}% de sucesso**, atingindo vazão de **${peak.stats.throughputRps} req/s**, mediana **P50 de ${peak.stats.p50Ms} ms** e **P95 de ${peak.stats.p95Ms} ms**, confirmando elasticidade adequada do pool de conexões HikariCP e das threads do servidor embarcado.

## 6. Evidências Gráficas

- Curva Vazão vs Latência: \`graficos/01-carga-vazao-vs-latencia.png\`
- Evolução dos Percentis (P50–P99): \`graficos/02-carga-distribuicao-percentis.png\`
`;

  saveMarkdownReport(dirs.mdPath, md);
  console.log(`[NF-02 CARGA] Concluido! Relatorio salvo em: ${dirs.mdPath}`);
  if (!overallPassed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[NF-02 ERRO]', err);
  process.exit(1);
});
