import * as path from 'path';
import { chromium } from 'playwright';
import { ENV } from '../config/env';
import { loginApi } from '../helpers/auth-helper';
import {
  initSuiteDirs,
  saveJsonReport,
  saveMarkdownReport,
  renderChart,
  formatNowBr,
} from '../helpers/report-writer';

interface SecurityCaseResult {
  id: string;
  category: string;
  description: string;
  expectedBehavior: string;
  observedStatus: string;
  blockedOrProtected: boolean;
}

function forgeTamperedJwt(validToken: string, forgedSub: string): string {
  const parts = validToken.split('.');
  if (parts.length !== 3) return 'invalid.token.sig';
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  payload.sub = forgedSub;
  const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${parts[0]}.${tamperedPayload}.${parts[2]}`;
}

function forgeAlgNoneJwt(forgedSub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: forgedSub, iat: Math.floor(Date.now() / 1000) })
  ).toString('base64url');
  return `${header}.${payload}.`;
}

async function captureFrontendGuardEvidence(printsDir: string): Promise<boolean> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${ENV.frontendUrl}/entrar`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"], input[formcontrolname="email"]').first().fill(ENV.accounts.patient.email);
  await page.locator('input[type="password"]').first().fill(ENV.accounts.patient.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/patient/, { timeout: 15000 });

  await page.goto(`${ENV.frontendUrl}/admin/validacao`, { waitUntil: 'networkidle' });
  const currentUrl = page.url();
  const blocked = currentUrl.includes('/acesso-negado') || !currentUrl.includes('/admin/validacao');
  await page.screenshot({
    path: path.join(printsDir, '01-bloqueio-rbac-acesso-negado.png'),
    fullPage: false,
  });

  await browser.close();
  return blocked;
}

async function main() {
  console.log(`[NF-04 SEGURANCA] Iniciando auditoria de seguranca em ambiente: ${ENV.mode.toUpperCase()}`);
  const dirs = initSuiteDirs('04-seguranca', 'RELATORIO_NF_04_SEGURANCA.md');

  const patA = await loginApi(ENV.accounts.patient);
  const prof = await loginApi(ENV.accounts.professional);

  // Descobre ID de solicitacao de outro paciente (Paciente B no local, ou demanda visivel ao profissional de terceiro)
  let otherPatientRequestId = 999999;
  if (ENV.isLocal) {
    const patB = await loginApi(ENV.accounts.patientB);
    const rB = await fetch(`${ENV.backendUrl}/solicitacoes`, {
      headers: { Authorization: `Bearer ${patB.token}` },
    });
    const listB: any[] = (await rB.json()) as any[];
    if (Array.isArray(listB) && listB.length > 0) {
      otherPatientRequestId = listB[0].id;
    }
  } else {
    const rMy = await fetch(`${ENV.backendUrl}/solicitacoes`, {
      headers: { Authorization: `Bearer ${patA.token}` },
    });
    const myIds = new Set(((await rMy.json()) as any[]).map((x) => x.id));
    const rDisp = await fetch(`${ENV.backendUrl}/solicitacoes/disponiveis`, {
      headers: { Authorization: `Bearer ${prof.token}` },
    });
    const dispList: any[] = (await rDisp.json()) as any[];
    const foreign = dispList.find((x) => !myIds.has(x.id));
    if (foreign) otherPatientRequestId = foreign.id;
  }

  const cases: SecurityCaseResult[] = [];

  // SEC-01: BOLA / IDOR Leitura de solicitacao de outro paciente
  const sec01 = await fetch(`${ENV.backendUrl}/solicitacoes/${otherPatientRequestId}`, {
    headers: { Authorization: `Bearer ${patA.token}` },
  });
  cases.push({
    id: 'SEC-01',
    category: 'BOLA / IDOR',
    description: `Paciente A tenta ler solicitação #${otherPatientRequestId} pertencente ao Paciente B`,
    expectedBehavior: 'HTTP 403 ou 404 (Negado)',
    observedStatus: `HTTP ${sec01.status}`,
    blockedOrProtected: sec01.status === 403 || sec01.status === 404,
  });

  // SEC-02: BOLA / IDOR Edicao de solicitacao de outro paciente
  const sec02 = await fetch(`${ENV.backendUrl}/solicitacoes/${otherPatientRequestId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${patA.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      descricao: 'Tentativa maliciosa de alteracao de solicitacao alheia com mais de vinte caracteres.',
      modalidade: 'ONLINE',
      prazoDesejado: '2026-12-20',
      profissionais: [{ categoria: 'ENFERMAGEM', quantidadeVagas: 1, especialidadesIds: [1] }],
    }),
  });
  cases.push({
    id: 'SEC-02',
    category: 'BOLA / IDOR',
    description: `Paciente A tenta sobrescrever (PUT) solicitação #${otherPatientRequestId} do Paciente B`,
    expectedBehavior: 'HTTP 400, 403 ou 404 (Negado)',
    observedStatus: `HTTP ${sec02.status}`,
    blockedOrProtected: [400, 403, 404].includes(sec02.status),
  });

  // SEC-03: BOLA / IDOR Cancelamento de solicitacao de outro paciente
  const sec03 = await fetch(`${ENV.backendUrl}/solicitacoes/${otherPatientRequestId}/cancelar`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${patA.token}` },
  });
  cases.push({
    id: 'SEC-03',
    category: 'BOLA / IDOR',
    description: `Paciente A tenta cancelar (PATCH) solicitação #${otherPatientRequestId} do Paciente B`,
    expectedBehavior: 'HTTP 403 ou 404 (Negado)',
    observedStatus: `HTTP ${sec03.status}`,
    blockedOrProtected: sec03.status === 403 || sec03.status === 404,
  });

  // SEC-04: Escalada Vertical RBAC (Paciente -> Admin)
  const sec04 = await fetch(`${ENV.backendUrl}/admin/validacoes/profissionais`, {
    headers: { Authorization: `Bearer ${patA.token}` },
  });
  cases.push({
    id: 'SEC-04',
    category: 'RBAC Vertical',
    description: 'Paciente tenta acessar fila restrita de validação administrativa (/admin/validacoes)',
    expectedBehavior: 'HTTP 401 ou 403 (Negado)',
    observedStatus: `HTTP ${sec04.status}`,
    blockedOrProtected: sec04.status === 401 || sec04.status === 403,
  });

  // SEC-05: Isolamento Horizontal RBAC (Profissional -> Endpoint exclusivo de Paciente)
  const sec05 = await fetch(`${ENV.backendUrl}/solicitacoes`, {
    headers: { Authorization: `Bearer ${prof.token}` },
  });
  cases.push({
    id: 'SEC-05',
    category: 'RBAC Horizontal',
    description: 'Profissional puro tenta listar painel privado de solicitações de paciente (/solicitacoes)',
    expectedBehavior: 'HTTP 403 (Negado)',
    observedStatus: `HTTP ${sec05.status}`,
    blockedOrProtected: sec05.status === 401 || sec05.status === 403,
  });

  // SEC-06: Acesso Anonimo a Rota Protegida
  const sec06 = await fetch(`${ENV.backendUrl}/auth/me`);
  cases.push({
    id: 'SEC-06',
    category: 'Autenticação',
    description: 'Requisição anônima sem token JWT para /auth/me',
    expectedBehavior: 'HTTP 401 ou 403 (Negado)',
    observedStatus: `HTTP ${sec06.status}`,
    blockedOrProtected: sec06.status === 401 || sec06.status === 403,
  });

  // SEC-07: Adulteracao de Payload JWT (Troca de sub para Admin ID=4)
  const tamperedJwt = forgeTamperedJwt(patA.token, '4');
  const sec07 = await fetch(`${ENV.backendUrl}/admin/validacoes/profissionais`, {
    headers: { Authorization: `Bearer ${tamperedJwt}` },
  });
  cases.push({
    id: 'SEC-07',
    category: 'Criptografia JWT',
    description: 'Adulteração do payload JWT (claim sub alterado para Admin mantendo assinatura original)',
    expectedBehavior: 'HTTP 401 ou 403 (Assinatura Inválida)',
    observedStatus: `HTTP ${sec07.status}`,
    blockedOrProtected: sec07.status === 401 || sec07.status === 403,
  });

  // SEC-08: Ataque JWT alg=none
  const noneJwt = forgeAlgNoneJwt('4');
  const sec08 = await fetch(`${ENV.backendUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${noneJwt}` },
  });
  cases.push({
    id: 'SEC-08',
    category: 'Criptografia JWT',
    description: 'Ataque de downgrade de algoritmo JWT ("alg": "none" sem assinatura)',
    expectedBehavior: 'HTTP 401 ou 403 (Rejeitado)',
    observedStatus: `HTTP ${sec08.status}`,
    blockedOrProtected: sec08.status === 401 || sec08.status === 403,
  });

  // SEC-09: SQL Injection na busca publica de profissionais
  const sqliUrl = `${ENV.backendUrl}/publico/profissionais?cidade=${encodeURIComponent("' OR '1'='1' --")}`;
  const sec09 = await fetch(sqliUrl);
  const sec09Body = await sec09.text();
  const noSqlLeak = sec09.status === 200 && !/syntax error|postgresql|jdbc|org\.hibernate/i.test(sec09Body);
  cases.push({
    id: 'SEC-09',
    category: 'Injeção (SQLi)',
    description: "Injeção SQL no parâmetro cidade (' OR '1'='1' --) em /publico/profissionais",
    expectedBehavior: 'Parametrização segura sem erro 500 nem vazamento de stacktrace',
    observedStatus: `HTTP ${sec09.status} (Sem leak SQL)`,
    blockedOrProtected: noSqlLeak,
  });

  // SEC-10: SQL Injection no Login
  const sec10 = await fetch(`${ENV.backendUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: "admin@quickcare.dev' OR 1=1--", senha: 'qualquer' }),
  });
  cases.push({
    id: 'SEC-10',
    category: 'Injeção (SQLi)',
    description: "Bypass de autenticação via SQL Injection no campo e-mail de /auth/login",
    expectedBehavior: 'HTTP 400 ou 401 (Bloqueado)',
    observedStatus: `HTTP ${sec10.status}`,
    blockedOrProtected: sec10.status === 400 || sec10.status === 401,
  });

  // SEC-11: Anti-Enumeracao de Usuarios na Recuperacao de Senha
  const rExist = await fetch(`${ENV.backendUrl}/auth/senha/esqueci`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ENV.accounts.patient.email }),
  });
  const rNonExist = await fetch(`${ENV.backendUrl}/auth/senha/esqueci`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nao.existe.auditoria.999@quickcare.dev' }),
  });
  const txt1 = await rExist.text();
  const txt2 = await rNonExist.text();
  const antiEnumOk = rExist.status === rNonExist.status && txt1 === txt2;
  cases.push({
    id: 'SEC-11',
    category: 'Privacidade / Anti-Enumeração',
    description: 'Comparação de resposta em /auth/senha/esqueci para e-mail existente vs inexistente',
    expectedBehavior: 'Mesmo HTTP Status e mesma mensagem neutra',
    observedStatus: `HTTP ${rExist.status} == HTTP ${rNonExist.status}`,
    blockedOrProtected: antiEnumOk,
  });

  // SEC-12: Minimizacao LGPD em rotas publicas + Guard Visual no Angular
  const pubSolRes = await fetch(`${ENV.backendUrl}/publico/solicitacoes`);
  const pubSolJson = await pubSolRes.text();
  const lgpdClean = !/"(cpf|senha|senhaHash|telefone|logradouro|numero|complemento)"\s*:/i.test(pubSolJson);
  const uiGuardBlocked = await captureFrontendGuardEvidence(dirs.printsDir);

  cases.push({
    id: 'SEC-12',
    category: 'LGPD & Guard SPA',
    description: 'Ocultação de PII sensível em /publico/solicitacoes + bloqueio /acesso-negado no Frontend',
    expectedBehavior: 'Zero vazamento PII + redirecionamento para /acesso-negado',
    observedStatus: lgpdClean && uiGuardBlocked ? 'PII Oculto + Guard Ativo' : 'Falha detectada',
    blockedOrProtected: lgpdClean && uiGuardBlocked,
  });

  for (const c of cases) {
    console.log(`  -> [${c.id}] ${c.category}: ${c.observedStatus} -> ${c.blockedOrProtected ? 'PROTEGIDO' : 'VULNERAVEL'}`);
  }

  // Agrupa por categoria para o grafico
  const catNames = Array.from(new Set(cases.map((c) => c.category)));
  const passedByCat = catNames.map(
    (cat) => cases.filter((c) => c.category === cat && c.blockedOrProtected).length
  );
  const totalByCat = catNames.map((cat) => cases.filter((c) => c.category === cat).length);

  renderChart({
    kind: 'grouped_bar',
    title: 'NF-04 Segurança — Vetores de Ataque Testados vs Bloqueados com Sucesso',
    ylabel: 'Quantidade de Controles Verificados',
    labels: catNames,
    xtick_rotation: 12,
    series: [
      { name: 'Vetores Testados', values: totalByCat, color: '#0284C7' },
      { name: 'Ataques Bloqueados / Mitigados', values: passedByCat, color: '#16A34A' },
    ],
    output: path.join(dirs.chartsDir, '01-seguranca-controles-owasp.png'),
  });

  const passedCount = cases.filter((c) => c.blockedOrProtected).length;
  const overallPassed = passedCount === cases.length;
  const executedAt = formatNowBr();

  saveJsonReport(dirs.jsonPath, {
    suite: 'NF-04',
    category: 'Segurança',
    iso25010Characteristic: 'Security — Confidentiality, Integrity, Authenticity & Accountability',
    environment: ENV.mode,
    executedAt,
    totalVectors: cases.length,
    blockedVectors: passedCount,
    overallPassed,
    cases,
  });

  const rows = cases
    .map(
      (c) =>
        `| **${c.id}** | ${c.category} | ${c.description} | ${c.expectedBehavior} | \`${c.observedStatus}\` | **${c.blockedOrProtected ? 'PROTEGIDO' : 'VULNERÁVEL'}** |`
    )
    .join('\n');

  const md = `# Relatório Técnico NF-04 — Teste de Segurança (OWASP API & LGPD)

- **Característica ISO/IEC 25010:** Segurança (*Confidentiality, Integrity & Authenticity*)
- **Data/Hora da Execução:** ${executedAt}
- **Ambiente Avaliado:** \`${ENV.mode.toUpperCase()}\`
- **Resultado Global:** **${overallPassed ? `APROVADO (${passedCount}/${cases.length} vetores mitigados — 100%)` : `REPROVADO (${passedCount}/${cases.length})`}**

## 1. Objetivo

Identificar vulnerabilidades de controle de acesso, autenticação, injeção e privacidade na plataforma **QuickCare**, garantindo especialmente que **um paciente seja estritamente impedido de visualizar, editar ou cancelar solicitações e dados pertencentes a outro paciente** (*Broken Object Level Authorization — BOLA/IDOR*).

## 2. Matriz de Vetores de Ataque Executados

| ID | Domínio OWASP / LGPD | Vetor Testado | Comportamento Esperado | Resultado Observado | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
${rows}

## 3. Evidências Geradas

- Gráfico de Mitigação por Domínio OWASP: \`graficos/01-seguranca-controles-owasp.png\`
- Evidência Visual de Bloqueio RBAC (\`/acesso-negado\`): \`prints/01-bloqueio-rbac-acesso-negado.png\`
`;

  saveMarkdownReport(dirs.mdPath, md);
  console.log(`[NF-04 SEGURANCA] Concluido (${passedCount}/${cases.length})! Relatorio salvo em: ${dirs.mdPath}`);
  if (!overallPassed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[NF-04 ERRO]', err);
  process.exit(1);
});
