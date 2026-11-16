# Relatório Técnico NF-09 — Teste de Disponibilidade (SLI, SLO e Sondas de Saúde)

- **Característica ISO/IEC 25010:** Confiabilidade — Disponibilidade (*Reliability — Availability*)
- **Data/Hora da Execução:** 16/11/2026, 02:09:59
- **Ambiente Avaliado:** `LOCAL`
- **SLI Global Aferido:** **100%** (Meta SLO >= 99,5%) — **APROVADO**

## 1. Objetivo

Verificar a prontidão operacional contínua (*Availability*) dos subsistemas que compõem a arquitetura do **QuickCare** (aplicação web Angular, API Spring Boot, sondas *Liveness*/*Readiness* e conectividade ativa com PostgreSQL/PostGIS e disco), aferindo o *Service Level Indicator* (**SLI**) frente ao *Service Level Objective* (**SLO >= 99,5%**).

## 2. Matriz de Sondas Sintéticas Contínuas (30 ciclos por componente)

| Subsistemas / Sondas | URL Monitorada | Sucesso | SLI Disponibilidade | 1ª Sonda (Cold) | Média Estável (Warm) | Status SLO |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| Actuator Health (Geral + DB) | `http://localhost:8080/actuator/health` | 30/30 | **100%** | 53.2 ms | 7.89 ms | **DENTRO DO SLO** |
| Probe Liveness (Kubernetes/Container) | `http://localhost:8080/actuator/health/liveness` | 30/30 | **100%** | 7.32 ms | 6.2 ms | **DENTRO DO SLO** |
| Probe Readiness (Tráfego Pronto) | `http://localhost:8080/actuator/health/readiness` | 30/30 | **100%** | 8.47 ms | 5.96 ms | **DENTRO DO SLO** |
| API Busca de Profissionais | `http://localhost:8080/publico/profissionais` | 30/30 | **100%** | 251.74 ms | 168.62 ms | **DENTRO DO SLO** |
| Frontend Web App (SPA) | `http://localhost:4200/` | 30/30 | **100%** | 5.61 ms | 2.08 ms | **DENTRO DO SLO** |

## 3. Subsistemas Internos Auditados via Spring Boot Actuator

- **Componentes reportando estado `UP`:** `db, diskSpace, livenessState, ping, readinessState, ssl`.

## 4. Evidência Gráfica

- Indicador SLI de Disponibilidade vs Meta SLO: `graficos/01-disponibilidade-sli-slo.png`
