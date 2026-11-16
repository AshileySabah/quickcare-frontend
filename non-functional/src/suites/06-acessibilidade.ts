import * as path from 'path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { ENV } from '../config/env';
import { round2 } from '../helpers/http-engine';
import {
  initSuiteDirs,
  saveJsonReport,
  saveMarkdownReport,
  renderChart,
  formatNowBr,
} from '../helpers/report-writer';

interface ScreenA11yAudit {
  screen: string;
  route: string;
  wcagPassedRules: number;
  wcagViolationsTotal: number;
  criticalViolations: number;
  complianceScorePct: number;
  hasH1: boolean;
  labeledInputsPct: number;
  violationIds: string[];
}

async function main() {
  console.log(`[NF-06 ACESSIBILIDADE] Iniciando auditoria WCAG 2.1 AA, Teclado e Leitores de Tela (${ENV.mode.toUpperCase()})...`);
  const dirs = initSuiteDirs('06-acessibilidade', 'RELATORIO_NF_06_ACESSIBILIDADE.md');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Teste Pratico de Navegacao 100% por Teclado (sem uso de mouse) no fluxo de Login
  await page.goto(`${ENV.frontendUrl}/entrar`, { waitUntil: 'networkidle' });
  const focusedTags: string[] = [];

  // Pressiona Tab ate atingir o campo de e-mail
  let emailFocused = false;
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return { tag: 'NONE', type: '' };
      return { tag: el.tagName, type: (el as HTMLInputElement).type || '' };
    });
    focusedTags.push(`${info.tag}${info.type ? `[${info.type}]` : ''}`);
    if (info.tag === 'INPUT' && (info.type === 'email' || info.type === 'text')) {
      emailFocused = true;
      break;
    }
  }

  await page.screenshot({
    path: path.join(dirs.printsDir, '01-acessibilidade-foco-teclado.png'),
    fullPage: false,
  });

  let keyboardLoginSuccess = false;
  if (emailFocused) {
    await page.keyboard.type(ENV.accounts.patient.email);
    await page.keyboard.press('Tab');
    // Caso exista link ou botao intermediario, avanca ate password
    for (let j = 0; j < 4; j++) {
      const isPw = await page.evaluate(
        () => (document.activeElement as HTMLInputElement | null)?.type === 'password'
      );
      if (isPw) break;
      await page.keyboard.press('Tab');
    }
    await page.keyboard.type(ENV.accounts.patient.password);
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/patient/, { timeout: 15000 }).catch(() => {});
    keyboardLoginSuccess = page.url().includes('/patient');
  }

  // 2. Auditoria Automatizada WCAG 2.1 A/AA (axe-core) + Semantica de Leitores de Tela em 5 telas
  const screensToAudit = [
    { screen: 'Home Pública', route: '/', authRequired: false },
    { screen: 'Busca de Profissionais', route: '/consulta/profissionais', authRequired: false },
    { screen: 'Login', route: '/entrar', authRequired: false },
    { screen: 'Seleção de Cadastro', route: '/cadastro', authRequired: false },
    { screen: 'Painel do Paciente', route: '/patient', authRequired: true },
  ];

  const audits: ScreenA11yAudit[] = [];

  for (const s of screensToAudit) {
    const auditCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await auditCtx.newPage();

    if (s.authRequired) {
      await p.goto(`${ENV.frontendUrl}/entrar`, { waitUntil: 'networkidle' });
      await p.locator('input[type="email"], input[formcontrolname="email"]').first().fill(ENV.accounts.patient.email);
      await p.locator('input[type="password"]').first().fill(ENV.accounts.patient.password);
      await p.getByRole('button', { name: /entrar/i }).click();
      await p.waitForURL(/\/patient/, { timeout: 15000 });
    } else {
      await p.goto(`${ENV.frontendUrl}${s.route}`, { waitUntil: 'networkidle' });
    }

    await p.locator('ui-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

    const axeRes = await new AxeBuilder({ page: p })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const semantics = await p.evaluate(() => {
      const h1Count = document.querySelectorAll('h1').length;
      const inputs = Array.from(
        document.querySelectorAll('input:not([type="hidden"]), select, textarea')
      ) as HTMLElement[];
      let labeled = 0;
      for (const inp of inputs) {
        const id = inp.getAttribute('id');
        const hasForLabel = id ? !!document.querySelector(`label[for="${CSS.escape(id)}"]`) : false;
        const hasWrapLabel = !!inp.closest('label');
        const hasAria =
          !!inp.getAttribute('aria-label') ||
          !!inp.getAttribute('aria-labelledby') ||
          !!inp.closest('ui-input, ui-select, ui-textarea')?.querySelector('label');
        if (hasForLabel || hasWrapLabel || hasAria) labeled++;
      }
      return {
        hasH1: h1Count >= 1,
        labeledInputsPct: inputs.length === 0 ? 100 : Math.round((labeled / inputs.length) * 10000) / 100,
      };
    });

    const passedRules = axeRes.passes.length;
    const totalViol = axeRes.violations.length;
    const critViol = axeRes.violations.filter((v) => v.impact === 'critical').length;
    const score = round2((passedRules / Math.max(passedRules + totalViol, 1)) * 100);

    audits.push({
      screen: s.screen,
      route: s.route,
      wcagPassedRules: passedRules,
      wcagViolationsTotal: totalViol,
      criticalViolations: critViol,
      complianceScorePct: score,
      hasH1: semantics.hasH1,
      labeledInputsPct: semantics.labeledInputsPct,
      violationIds: axeRes.violations.map((v) => `${v.id} (${v.impact})`),
    });

    console.log(
      `  -> ${s.screen}: WCAG Conformidade=${score}% (${passedRules} regras OK, ${critViol} criticas) | H1=${semantics.hasH1} | Inputs Rotulados=${semantics.labeledInputsPct}%`
    );

    await auditCtx.close();
  }

  await context.close();
  await browser.close();

  renderChart({
    kind: 'grouped_bar',
    title: 'NF-06 Acessibilidade — Conformidade WCAG 2.1 AA e Rotulagem para Leitores de Tela',
    ylabel: 'Índice (%)',
    labels: audits.map((a) => a.screen),
    xtick_rotation: 12,
    series: [
      {
        name: 'Conformidade Regras WCAG 2.1 AA (%)',
        values: audits.map((a) => a.complianceScorePct),
        color: '#0F766E',
      },
      {
        name: 'Campos Rotulados p/ Leitor de Tela (%)',
        values: audits.map((a) => a.labeledInputsPct),
        color: '#0284C7',
      },
    ],
    threshold: {
      value: 85,
      label: 'Meta Mínima de Conformidade (85%)',
      color: '#DC2626',
    },
    output: path.join(dirs.chartsDir, '01-acessibilidade-wcag-leitores.png'),
  });

  const avgCompliance = round2(
    audits.reduce((acc, a) => acc + a.complianceScorePct, 0) / audits.length
  );
  const overallPassed = keyboardLoginSuccess && avgCompliance >= 85;
  const executedAt = formatNowBr();

  saveJsonReport(dirs.jsonPath, {
    suite: 'NF-06',
    category: 'Acessibilidade',
    iso25010Characteristic: 'Usability — Accessibility (WCAG 2.1 AA, Keyboard & Screen Reader)',
    environment: ENV.mode,
    executedAt,
    keyboardNavigation: {
      emailFocusedViaTab: emailFocused,
      loginCompletedWithoutMouse: keyboardLoginSuccess,
      tabSequenceSample: focusedTags,
    },
    averageWcagCompliancePct: avgCompliance,
    overallPassed,
    audits,
  });

  const rows = audits
    .map(
      (a) =>
        `| ${a.screen} | \`${a.route}\` | ${a.wcagPassedRules} | ${a.criticalViolations} | **${a.complianceScorePct}%** | ${a.hasH1 ? 'Sim (`<h1>`)' : 'Não'} | **${a.labeledInputsPct}%** | ${a.violationIds.length > 0 ? a.violationIds.join(', ') : 'Nenhuma'} |`
    )
    .join('\n');

  const md = `# Relatório Técnico NF-06 — Teste de Acessibilidade (WCAG 2.1 AA, Teclado e Leitores de Tela)

- **Característica ISO/IEC 25010:** Acessibilidade (*Accessibility — WCAG 2.1 Níveis A e AA*)
- **Data/Hora da Execução:** ${executedAt}
- **Ambiente Avaliado:** \`${ENV.mode.toUpperCase()}\`
- **Resultado Global:** **${overallPassed ? `APROVADO (Navegação 100% por teclado funcional e média WCAG de ${avgCompliance}%)` : 'ATENÇÃO'}**

## 1. Objetivo

Verificar se pessoas com diferentes necessidades (deficiência visual parcial/total com leitores de tela como NVDA/VoiceOver e restrições motoras que dependem exclusivamente de navegação por teclado) conseguem operar os fluxos essenciais do **QuickCare**.

## 2. Teste Funcional de Navegação Exclusiva por Teclado (Sem Mouse)

- **Sequência de Foco (\`Tab\`):** \`${focusedTags.join(' -> ')}\`
- **Preenchimento e Autenticação via \`Tab\` + \`Enter\`:** **${keyboardLoginSuccess ? 'APROVADO (Login concluído e redirecionado a /patient sem cliques de mouse)' : 'FALHOU'}**

## 3. Auditoria Automatizada WCAG 2.1 AA (\`@axe-core/playwright\`) e Semântica ARIA

| Tela Auditada | Rota | Regras WCAG Aprovadas | Violações Críticas | Índice WCAG | Heading Principal | Rótulos Leitores de Tela | Observações / Pontos de Atenção |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
${rows}

## 4. Evidências Geradas

- Gráfico de Conformidade WCAG & Leitores de Tela: \`graficos/01-acessibilidade-wcag-leitores.png\`
- Foco de Teclado Visível na Autenticação: \`prints/01-acessibilidade-foco-teclado.png\`
`;

  saveMarkdownReport(dirs.mdPath, md);
  console.log(`[NF-06 ACESSIBILIDADE] Concluido (Media WCAG=${avgCompliance}%, Teclado=${keyboardLoginSuccess})!`);
  if (!overallPassed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[NF-06 ERRO]', err);
  process.exit(1);
});
