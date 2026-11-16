# Suíte de Testes End-to-End (E2E) — QuickCare (Playwright + TypeScript)

Esta pasta contém a suíte **100% isolada e desacoplada** de testes End-to-End (E2E) do **QuickCare**, desenvolvida incrementalmente com **Playwright + TypeScript**, Page Object Model e geração estruturada de relatórios e evidências visuais em `relatorios/`.

> **Isolamento garantido:** Nenhum arquivo fora desta pasta `e2e/` (`package.json`, `angular.json`, `tsconfig.json`, `src/` ou testes existentes em Jasmine/Karma e Cypress) foi modificado. Caso deseje descartar esta suíte no futuro, basta apagar a pasta `e2e/` ou retornar para a branch `main`.

---

## 1. Instalação Inicial

```powershell
cd D:\GIT\Github\quickcare-fixed\quickcare-frontend\e2e
npm install
npx playwright install chromium
```

---

## 2. Execução e Relatórios por Suíte

### Teste 01 — Vitrine Pública e Navegação Inicial (`01-publico-e-navegacao.spec.ts`)
Valida a Home institucional (`/`), redirecionamento dos CTAs principais (`/cadastro/paciente` e `/cadastro/profissional`), a Consulta Pública de Profissionais (`/consulta/profissionais`) com filtros dinâmicos e a Consulta Pública de Solicitações (`/consulta/solicitacoes`) com preservação de sigilo LGPD.

```powershell
# Executar o Teste 01 no ambiente remoto e atualizar evidências + relatório HTML/JSON
npm run test:01:remote

# Abrir o relatório HTML interativo salvo do Teste 01
npm run report:01
```

**Evidências salvas e versionadas em:**
- `relatorios/01-publico-e-navegacao/RELATORIO_TESTE_01.md` — Relatório técnico completo com data/hora, métricas, tabela de casos de teste e prints embutidos.
- `relatorios/01-publico-e-navegacao/prints/` — Capturas de tela em alta resolução de cada etapa executada.
- `relatorios/01-publico-e-navegacao/resultado-execucao.json` — Metadados brutos da execução (tempos em ms, status, steps).
- `relatorios/01-publico-e-navegacao/html-report/` — Relatório HTML autocontido do Playwright.

### Teste 02 — Tela de Login e Validações de Formulário (`02-login-validacoes.spec.ts`)
Valida submissão vazia, exigência individual de e-mail e senha, formato inválido de e-mail, comprimento mínimo da senha, alternância de visibilidade da senha, links auxiliares (`/esqueci-senha` e `/cadastro`) e rejeição HTTP de credenciais inexistentes pela API com feedback visual (*toast*).

```powershell
# Executar o Teste 02 no ambiente remoto e atualizar evidências + relatório HTML/JSON
npm run test:02:remote

# Abrir o relatório HTML interativo salvo do Teste 02
npm run report:02
```

**Evidências salvas e versionadas em:** `relatorios/02-login-validacoes/` (`RELATORIO_TESTE_02.md`, `prints/`, `resultado-execucao.json` e `html-report/`).

### Teste 03 — Cadastro, Regras de Validação e Consentimento LGPD (`03-cadastro-validacoes-lgpd.spec.ts`)
Valida a escolha de perfil em `/cadastro` (Paciente e Profissional de saúde), bloqueio de submissão sem documentos comprobatórios nem aceite expresso da LGPD, máscara e cálculo de dígitos verificadores de CPF, limite máximo na data de nascimento, requisitos de senha forte e divergência na confirmação de senha.

```powershell
# Executar o Teste 03 no ambiente remoto e atualizar evidências + relatório HTML/JSON
npm run test:03:remote

# Abrir o relatório HTML interativo salvo do Teste 03
npm run report:03
```

**Evidências salvas e versionadas em:** `relatorios/03-cadastro-validacoes-lgpd/` (`RELATORIO_TESTE_03.md`, `prints/`, `resultado-execucao.json` e `html-report/`).

### Teste 04 — Proteção de Rotas (Guards), Autenticação por Perfil e Multiconta (`04-autenticacao-guards-perfis.spec.ts`)
Valida o bloqueio de visitantes não autenticados (`authGuard`), autenticação real de Paciente, bloqueio RBAC ao tentar acessar área administrativa (`roleGuard` -> `/acesso-negado`), encerramento seguro de sessão (Logout), autenticação de Profissional de saúde, alternância dinâmica em conta Multiconta (`Paciente <-> Profissional`) e acesso de Administrador à fila de Validação cadastral.

```powershell
# Executar o Teste 04 no ambiente remoto (lê credenciais de .env.remote) e atualizar evidências
npm run test:04:remote

# Abrir o relatório HTML interativo salvo do Teste 04
npm run report:04
```

**Evidências salvas e versionadas em:** `relatorios/04-autenticacao-guards-perfis/` (`RELATORIO_TESTE_04.md`, `prints/`, `resultado-execucao.json` e `html-report/`).

### Teste 05 — Jornada Completa Multiusuário: Solicitação -> Proposta -> Aceite -> Chat WebSocket (`05-jornada-completa-multiusuario.spec.ts`)
Abre **dois contextos isolados do navegador simultaneamente** (Paciente + Profissional), descobre dinamicamente a atuação aprovada do profissional, cria uma solicitação compatível, registra proposta, confirma o aceite formal, valida a troca bidirecional de mensagens em tempo real via **STOMP/WebSocket** e executa autolimpeza cancelando a solicitação ao final.

```powershell
# Executar o Teste 05 no ambiente remoto e atualizar evidências
npm run test:05:remote

# Abrir o relatório HTML interativo salvo do Teste 05
npm run report:05
```

**Evidências salvas e versionadas em:** `relatorios/05-jornada-completa-multiusuario/` (`RELATORIO_TESTE_05.md`, `prints/`, `resultado-execucao.json` e `html-report/`).

### Teste 06 — Perfil Público Detalhado do Profissional (`06-perfil-publico-profissional.spec.ts`)
Valida a navegação da vitrine pública para o perfil detalhado (`/consulta/profissionais/:id`), exibição de atuações, registro profissional, localização, resumo de avaliações, funcionamento do link *Voltar*, conversão pelo CTA *"Quero ser atendido"* e tratamento amigável de ID inexistente (*Perfil não encontrado*).

```powershell
npm run test:06:remote
npm run report:06
```

**Evidências salvas e versionadas em:** `relatorios/06-perfil-publico-profissional/`.

### Teste 07 — Recuperação de Senha e Conta (`07-recuperacao-senha-e-conta.spec.ts`)
Valida o fluxo `/esqueci-senha` (campos obrigatórios, formato inválido e resposta neutra anti-enumeração), bloqueio de token inválido em `/redefinir-senha` e tratamento seguro em `/recuperar-conta`.

```powershell
npm run test:07:remote
npm run report:07
```

**Evidências salvas e versionadas em:** `relatorios/07-recuperacao-senha-e-conta/`.

---

## 3. Comandos Gerais

```powershell
# Rodar suíte remota (headless)
npm run test:remote

# Rodar suíte remota com navegador Chrome visível (slowMo = 500ms)
npm run test:remote:headed

# Abrir painel interativo Playwright UI Mode
npm run test:remote:ui
```
