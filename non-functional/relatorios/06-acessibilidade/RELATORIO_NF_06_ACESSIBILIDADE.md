# Relatório Técnico NF-06 — Teste de Acessibilidade (WCAG 2.1 AA, Teclado e Leitores de Tela)

- **Característica ISO/IEC 25010:** Acessibilidade (*Accessibility — WCAG 2.1 Níveis A e AA*)
- **Data/Hora da Execução:** 16/11/2026, 02:07:36
- **Ambiente Avaliado:** `LOCAL`
- **Resultado Global:** **APROVADO (Navegação 100% por teclado funcional e média WCAG de 98.62%)**

## 1. Objetivo

Verificar se pessoas com diferentes necessidades (deficiência visual parcial/total com leitores de tela como NVDA/VoiceOver e restrições motoras que dependem exclusivamente de navegação por teclado) conseguem operar os fluxos essenciais do **QuickCare**.

## 2. Teste Funcional de Navegação Exclusiva por Teclado (Sem Mouse)

- **Sequência de Foco (`Tab`):** `A -> INPUT[email]`
- **Preenchimento e Autenticação via `Tab` + `Enter`:** **APROVADO (Login concluído e redirecionado a /patient sem cliques de mouse)**

## 3. Auditoria Automatizada WCAG 2.1 AA (`@axe-core/playwright`) e Semântica ARIA

| Tela Auditada | Rota | Regras WCAG Aprovadas | Violações Críticas | Índice WCAG | Heading Principal | Rótulos Leitores de Tela | Observações / Pontos de Atenção |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| Home Pública | `/` | 19 | 0 | **100%** | Sim (`<h1>`) | **100%** | Nenhuma |
| Busca de Profissionais | `/consulta/profissionais` | 27 | 0 | **100%** | Sim (`<h1>`) | **100%** | Nenhuma |
| Login | `/entrar` | 24 | 0 | **100%** | Sim (`<h1>`) | **100%** | Nenhuma |
| Seleção de Cadastro | `/cadastro` | 17 | 0 | **100%** | Sim (`<h1>`) | **100%** | Nenhuma |
| Painel do Paciente | `/patient` | 27 | 1 | **93.1%** | Sim (`<h1>`) | **100%** | aria-roles (critical), color-contrast (serious) |

## 4. Evidências Geradas

- Gráfico de Conformidade WCAG & Leitores de Tela: `graficos/01-acessibilidade-wcag-leitores.png`
- Foco de Teclado Visível na Autenticação: `prints/01-acessibilidade-foco-teclado.png`
