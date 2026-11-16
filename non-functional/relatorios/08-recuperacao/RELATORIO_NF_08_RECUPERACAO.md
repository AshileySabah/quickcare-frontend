# Relatório Técnico NF-08 — Teste de Recuperação e Tolerância a Falhas

- **Característica ISO/IEC 25010:** Confiabilidade — Recuperabilidade e Tolerância a Falhas (*Recoverability & Fault Tolerance*)
- **Data/Hora da Execução:** 16/11/2026, 02:09:28
- **Ambiente Avaliado:** `LOCAL DOCKER` (`quickcare-backend` + `quickcare-postgres`)
- **Resultado Global:** **APROVADO (RTO = 21.96 s | RPO = 0 perda de dados | UI resiliente)**

## 1. Objetivo

Avaliar a capacidade da plataforma **QuickCare** de suportar uma interrupção abrupta do servidor de aplicação, tratar graciosamente a indisponibilidade temporária no frontend sem travamento da SPA, restabelecer automaticamente as conexões JDBC/Flyway/Spring Security após o religamento e preservar 100% das transações confirmadas antes do incidente.

## 2. Indicadores de Continuidade de Negócio Aferidos

| Indicador | Sigla | Resultado Medido | Meta Operacional | Status |
| :--- | :---: | :---: | :---: | :---: |
| *Recovery Time Objective* (Tempo de Restauração da API + Pool DB) | **RTO** | **21.96 s** | <= 35,0 s | **APROVADO** |
| *Recovery Point Objective* (Perda de Transações Confirmadas — Solicitação #59) | **RPO** | **0 registros perdidos** | 0 perda | **APROVADO** |
| Degradação Graciosa da Interface Angular durante Queda da API | **UI Fault Tolerance** | **SPA ativa c/ feedback de erro** | Sem tela branca | **APROVADO** |
| Retomada Automática da Busca de Profissionais após Retorno | **Auto-Heal** | **100% funcional** | Automática | **APROVADO** |

## 3. Evidências Geradas

- Linha do Tempo de Queda e Restauração (RTO): `graficos/01-recuperacao-linha-do-tempo-rto.png`
- Comportamento Gracioso da UI Durante Queda da API: `prints/01-recuperacao-ui-durante-queda-api.png`
- Restauração Completa da Busca Após Religamento: `prints/02-recuperacao-ui-restaurada-pos-falha.png`
