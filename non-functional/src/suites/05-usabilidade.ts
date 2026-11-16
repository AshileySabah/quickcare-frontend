import * as path from 'path';
import { chromium } from 'playwright';
import { performance } from 'perf_hooks';
import { ENV } from '../config/env';
import { loginApi } from '../helpers/auth-helper';
import { round2 } from '../helpers/http-engine';
import {
  initSuiteDirs,
  saveJsonReport,
  saveMarkdownReport,
  renderChart,
  formatNowBr,
} from '../helpers/report-writer';

interface UsabilityCheck {
  id: string;
  heuristic: string;
  scenario: string;
  metricLabel: string;
  measuredValue: number;
  targetMaxOrMin: string;
  passed: boolean;
}

async function main() {
  console.log(`[NF-05 USABILIDADE] Iniciando avaliacao ISO 9241-11 / Nielsen em ambiente: ${ENV.mode.toUpperCase()}`);
  const dirs = initSuiteDirs('05-usabilidade', 'RELATORIO_NF_05_USABILIDADE.md');
  const checks: UsabilityCheck[] = [];

  const patApi = await loginApi(ENV.accounts.patient);
  const browser = await chromium.launch({ headless: true });

  // Contexto Desktop 1440x900
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktopCtx.newPage();

  // Login do paciente
  await page.goto(`${ENV.frontendUrl}/entrar`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[formcontrolname="email"]').first().fill(ENV.accounts.patient.email);
  await page.locator('input[type="password"]').first().fill(ENV.accounts.patient.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/patient/, { timeout: 15000 });
  await page.locator('ui-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // 1. Prevenção de erros + preservação de dados digitados no formulario de agendamento
  await page.goto(`${ENV.frontendUrl}/patient/novo`, { waitUntil: 'networkidle' });
  await page.locator('ui-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  const draftText = 'Atendimento domiciliar de enfermagem para acompanhamento pós-operatório.';
  const descTextarea = page.locator('textarea').first();
  await descTextarea.fill(draftText);
  await page.getByRole('button', { name: /criar solicitação/i }).click();
  await page.locator('[role="alert"]').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

  const preservedText = await descTextarea.inputValue();
  const visibleErrors = await page.locator('[role="alert"], [class*="error"]').count();
  checks.push({
    id: 'UX-01',
    heuristic: 'Nielsen #5 e #9 — Prevenção e Recuperação de Erros',
    scenario: 'Submissão incompleta preserva texto já preenchido pelo paciente e exibe orientação clara em português',
    metricLabel: 'Preservação de dados (%)',
    measuredValue: preservedText === draftText && visibleErrors > 0 ? 100 : 0,
    targetMaxOrMin: '100% preservado',
    passed: preservedText === draftText && visibleErrors > 0,
  });

  // 2. Eficiência e Facilidade da Jornada de Solicitação / Agendamento de Atendimento
  await page.goto(`${ENV.frontendUrl}/patient`, { waitUntil: 'networkidle' });
  await page.locator('ui-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  let interactionCount = 0;
  const startBooking = performance.now();

  // Passo 1: Clicar em Nova solicitação no dashboard do paciente (ou ir ao botao primario)
  const newBtn = page.getByRole('button', { name: /nova solicitação/i }).first();
  if (await newBtn.isVisible().catch(() => false)) {
    await newBtn.click();
  } else {
    await page.goto(`${ENV.frontendUrl}/patient/novo`);
  }
  interactionCount++;
  await page.waitForURL(/\/patient\/novo/, { timeout: 10000 });
  await page.locator('ui-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // Passo 2: Selecionar Categoria
  const categorySelect = page.locator('ui-select[formcontrolname="category"] select').first();
  const catOptions = await categorySelect.locator('option').evaluateAll((opts) =>
    opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean)
  );
  await categorySelect.selectOption(catOptions[0]);
  interactionCount++;

  // Passo 3: Selecionar Especialidade no ui-multi-select
  const multiSelect = page.locator('ui-multi-select').first();
  await multiSelect.locator('.ui-multi-select__control').click();
  interactionCount++;
  await multiSelect.locator('.ui-multi-select__option').first().click();
  interactionCount++;
  await page.keyboard.press('Escape').catch(() => {});

  // Passo 4: Preencher descrição
  await page
    .locator('ui-textarea[formcontrolname="description"] textarea')
    .fill('Solicitação de teste de usabilidade NF-05 para aferição de cliques e fluidez de agendamento.');
  interactionCount++;

  // Passo 5: Selecionar Modalidade Online (evita exigir 6 campos extras de endereco quando online!)
  const modSelect = page.locator('ui-select[formcontrolname="modality"] select');
  await modSelect.selectOption('online');
  interactionCount++;

  // Passo 6: Definir Prazo Desejado (+10 dias para zero impacto de ocorrencia na limpeza)
  const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.locator('ui-input[formcontrolname="desiredDeadline"] input').fill(future);
  interactionCount++;

  await page.screenshot({
    path: path.join(dirs.printsDir, '01-usabilidade-formulario-agendamento.png'),
    fullPage: false,
  });

  // Passo 7: Submeter e aguardar confirmacao da criacao
  const createRespPromise = page.waitForResponse(
    (res) => res.url().endsWith('/solicitacoes') && res.request().method() === 'POST',
    { timeout: 15000 }
  );
  await page.getByRole('button', { name: /criar solicitação/i }).click();
  interactionCount++;

  const createResp = await createRespPromise;
  const createdOk = createResp.status() === 201;
  const createdBody: any = createdOk ? await createResp.json() : null;
  const bookingTimeSec = round2((performance.now() - startBooking) / 1000);

  // Autolimpeza imediata via API para manter ambiente limpo
  if (createdBody?.id) {
    await fetch(`${ENV.backendUrl}/solicitacoes/${createdBody.id}/cancelar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${patApi.token}` },
    });
  }

  checks.push({
    id: 'UX-02',
    heuristic: 'ISO 9241-11 — Eficiência (Esforço de Interação)',
    scenario: 'Quantidade de interações do paciente para concluir abertura de atendimento online',
    metricLabel: 'Interações / Cliques',
    measuredValue: interactionCount,
    targetMaxOrMin: '<= 10 interações',
    passed: createdOk && interactionCount <= 10,
  });

  checks.push({
    id: 'UX-03',
    heuristic: 'ISO 9241-11 — Eficiência Temporal',
    scenario: 'Tempo ponta a ponta de preenchimento e confirmação da solicitação de atendimento',
    metricLabel: 'Tempo de Conclusão (s)',
    measuredValue: bookingTimeSec,
    targetMaxOrMin: '<= 8,0 s',
    passed: createdOk && bookingTimeSec <= 8.0,
  });

  // 3. Descoberta e filtro rapido de profissionais
  const startSearch = performance.now();
  await page.goto(`${ENV.frontendUrl}/consulta/profissionais`, { waitUntil: 'networkidle' });
  await page.locator('ui-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  const searchTimeSec = round2((performance.now() - startSearch) / 1000);
  checks.push({
    id: 'UX-04',
    heuristic: 'Nielsen #6 — Reconhecimento em vez de Memorização',
    scenario: 'Acesso direto e filtragem visual da busca de profissionais com especialidades explícitas',
    metricLabel: 'Tempo até Lista Visível (s)',
    measuredValue: searchTimeSec,
    targetMaxOrMin: '<= 3,0 s',
    passed: searchTimeSec <= 3.0,
  });

  await desktopCtx.close();

  // 4. Responsividade e Ausencia de Overflow Horizontal em Smartphone (390x844)
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mPage = await mobileCtx.newPage();
  const mobileRoutes = ['/', '/consulta/profissionais', '/entrar'];
  let mobileCleanCount = 0;

  for (const r of mobileRoutes) {
    await mPage.goto(`${ENV.frontendUrl}${r}`, { waitUntil: 'networkidle' });
    await mPage.locator('ui-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    const noOverflow = await mPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2
    );
    if (noOverflow) mobileCleanCount++;
    if (r === '/consulta/profissionais') {
      await mPage.screenshot({
        path: path.join(dirs.printsDir, '02-usabilidade-responsividade-mobile.png'),
        fullPage: false,
      });
    }
  }
  await mobileCtx.close();
  await browser.close();

  const mobilePct = round2((mobileCleanCount / mobileRoutes.length) * 100);
  checks.push({
    id: 'UX-05',
    heuristic: 'Nielsen #4 & Design Responsivo Mobile-First',
    scenario: 'Adaptação em tela smartphone (390x844) sem rolagem horizontal indevida nas rotas críticas',
    metricLabel: 'Telas Sem Overflow (%)',
    measuredValue: mobilePct,
    targetMaxOrMin: '100%',
    passed: mobileCleanCount === mobileRoutes.length,
  });

  for (const c of checks) {
    console.log(`  -> [${c.id}] ${c.metricLabel}: ${c.measuredValue} (Meta: ${c.targetMaxOrMin}) -> ${c.passed ? 'APROVADO' : 'REPROVADO'}`);
  }

  renderChart({
    kind: 'grouped_bar',
    title: 'NF-05 Usabilidade — Esforço e Tempo da Jornada de Agendamento vs Limite Recomendado',
    ylabel: 'Unidades (Interações / Segundos)',
    labels: ['Interações p/ Agendar (un)', 'Tempo p/ Agendar (s)', 'Tempo Busca Profissionais (s)'],
    xtick_rotation: 0,
    series: [
      {
        name: 'Medido no QuickCare',
        values: [interactionCount, bookingTimeSec, searchTimeSec],
        color: '#0F766E',
      },
      {
        name: 'Teto Máximo Aceitável (UX Benchmark)',
        values: [10, 8.0, 3.0],
        color: '#94A3B8',
      },
    ],
    output: path.join(dirs.chartsDir, '01-usabilidade-eficiencia-jornada.png'),
  });

  const overallPassed = checks.every((c) => c.passed);
  const executedAt = formatNowBr();

  saveJsonReport(dirs.jsonPath, {
    suite: 'NF-05',
    category: 'Usabilidade',
    iso25010Characteristic: 'Usability — Operability, Learnability & User Error Protection',
    environment: ENV.mode,
    executedAt,
    overallPassed,
    checks,
  });

  const rows = checks
    .map(
      (c) =>
        `| **${c.id}** | ${c.heuristic} | ${c.scenario} | **${c.measuredValue}** | ${c.targetMaxOrMin} | **${c.passed ? 'APROVADO' : 'REPROVADO'}** |`
    )
    .join('\n');

  const md = `# Relatório Técnico NF-05 — Teste de Usabilidade (ISO 9241-11 & Heurísticas de Nielsen)

- **Característica ISO/IEC 25010:** Usabilidade (*Operability, User Error Protection & Appropriateness Recognizability*)
- **Data/Hora da Execução:** ${executedAt}
- **Ambiente Avaliado:** \`${ENV.mode.toUpperCase()}\`
- **Resultado Global:** **${overallPassed ? 'APROVADO (Jornada enxuta, responsiva e tolerante a erros)' : 'REPROVADO'}**

## 1. Objetivo

Avaliar empiricamente a facilidade de utilização da plataforma **QuickCare**, verificando se o **paciente consegue solicitar/agendar um atendimento com baixo esforço cognitivo e mínimo número de cliques**, proteção contra perda de preenchimento e adaptação responsiva em dispositivos móveis.

## 2. Métricas de Eficiência, Eficácia e Heurísticas Avaliadas

| ID | Referencial Normativo / Heurística | Cenário Verificado | Valor Medido | Meta UX | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
${rows}

## 3. Análise da Jornada de Agendamento pelo Paciente

- O fluxo completo desde o painel do paciente até a confirmação da solicitação (\`HTTP 201 Created\`) exigiu apenas **${interactionCount} interações**, concluindo em **${bookingTimeSec} s** (com formulário condicional inteligente que oculta automaticamente os campos de endereço quando a modalidade selecionada é *Online*).
- A solicitação criada durante o ensaio foi cancelada automaticamente em seguida para preservar o banco limpo.

## 4. Evidências Geradas

- Gráfico Comparativo de Esforço UX: \`graficos/01-usabilidade-eficiencia-jornada.png\`
- Formulário de Solicitação Preenchido (Desktop): \`prints/01-usabilidade-formulario-agendamento.png\`
- Visualização Responsiva Mobile (390x844): \`prints/02-usabilidade-responsividade-mobile.png\`
`;

  saveMarkdownReport(dirs.mdPath, md);
  console.log(`[NF-05 USABILIDADE] Concluido! Relatorio salvo em: ${dirs.mdPath}`);
  if (!overallPassed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[NF-05 ERRO]', err);
  process.exit(1);
});
