# Relatório Técnico NF-04 — Teste de Segurança (OWASP API & LGPD)

- **Característica ISO/IEC 25010:** Segurança (*Confidentiality, Integrity & Authenticity*)
- **Data/Hora da Execução:** 16/11/2026, 01:58:30
- **Ambiente Avaliado:** `LOCAL`
- **Resultado Global:** **APROVADO (12/12 vetores mitigados — 100%)**

## 1. Objetivo

Identificar vulnerabilidades de controle de acesso, autenticação, injeção e privacidade na plataforma **QuickCare**, garantindo especialmente que **um paciente seja estritamente impedido de visualizar, editar ou cancelar solicitações e dados pertencentes a outro paciente** (*Broken Object Level Authorization — BOLA/IDOR*).

## 2. Matriz de Vetores de Ataque Executados

| ID | Domínio OWASP / LGPD | Vetor Testado | Comportamento Esperado | Resultado Observado | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **SEC-01** | BOLA / IDOR | Paciente A tenta ler solicitação #3 pertencente ao Paciente B | HTTP 403 ou 404 (Negado) | `HTTP 404` | **PROTEGIDO** |
| **SEC-02** | BOLA / IDOR | Paciente A tenta sobrescrever (PUT) solicitação #3 do Paciente B | HTTP 400, 403 ou 404 (Negado) | `HTTP 400` | **PROTEGIDO** |
| **SEC-03** | BOLA / IDOR | Paciente A tenta cancelar (PATCH) solicitação #3 do Paciente B | HTTP 403 ou 404 (Negado) | `HTTP 404` | **PROTEGIDO** |
| **SEC-04** | RBAC Vertical | Paciente tenta acessar fila restrita de validação administrativa (/admin/validacoes) | HTTP 401 ou 403 (Negado) | `HTTP 403` | **PROTEGIDO** |
| **SEC-05** | RBAC Horizontal | Profissional puro tenta listar painel privado de solicitações de paciente (/solicitacoes) | HTTP 403 (Negado) | `HTTP 403` | **PROTEGIDO** |
| **SEC-06** | Autenticação | Requisição anônima sem token JWT para /auth/me | HTTP 401 ou 403 (Negado) | `HTTP 401` | **PROTEGIDO** |
| **SEC-07** | Criptografia JWT | Adulteração do payload JWT (claim sub alterado para Admin mantendo assinatura original) | HTTP 401 ou 403 (Assinatura Inválida) | `HTTP 401` | **PROTEGIDO** |
| **SEC-08** | Criptografia JWT | Ataque de downgrade de algoritmo JWT ("alg": "none" sem assinatura) | HTTP 401 ou 403 (Rejeitado) | `HTTP 401` | **PROTEGIDO** |
| **SEC-09** | Injeção (SQLi) | Injeção SQL no parâmetro cidade (' OR '1'='1' --) em /publico/profissionais | Parametrização segura sem erro 500 nem vazamento de stacktrace | `HTTP 200 (Sem leak SQL)` | **PROTEGIDO** |
| **SEC-10** | Injeção (SQLi) | Bypass de autenticação via SQL Injection no campo e-mail de /auth/login | HTTP 400 ou 401 (Bloqueado) | `HTTP 400` | **PROTEGIDO** |
| **SEC-11** | Privacidade / Anti-Enumeração | Comparação de resposta em /auth/senha/esqueci para e-mail existente vs inexistente | Mesmo HTTP Status e mesma mensagem neutra | `HTTP 200 == HTTP 200` | **PROTEGIDO** |
| **SEC-12** | LGPD & Guard SPA | Ocultação de PII sensível em /publico/solicitacoes + bloqueio /acesso-negado no Frontend | Zero vazamento PII + redirecionamento para /acesso-negado | `PII Oculto + Guard Ativo` | **PROTEGIDO** |

## 3. Evidências Geradas

- Gráfico de Mitigação por Domínio OWASP: `graficos/01-seguranca-controles-owasp.png`
- Evidência Visual de Bloqueio RBAC (`/acesso-negado`): `prints/01-bloqueio-rbac-acesso-negado.png`
