# Relatório Técnico NF-03 — Teste de Estresse (Limites e Ponto de Ruptura)

- **Característica ISO/IEC 25010:** Capacidade Limite e Comportamento sob Sobrecarga Extrema (*Stress & Breaking Point*)
- **Data/Hora da Execução:** 16/11/2026, 01:56:15
- **Ambiente Avaliado:** `LOCAL DOCKER` (`http://localhost:8080`)
- **Resultado Global:** **CONCLUÍDO COM SUCESSO (Limites operacionais e ponto de falha identificados empiricamente; auto-recuperação confirmada)**

## 1. Objetivo

Aumentar progressivamente o número de usuários simultâneos sob perfil severo (abertura contínua de novas conexões TCP sem *keep-alive*, combinando 75% de buscas relacionais multi-tabela `GET /publico/profissionais` e 25% de autenticações `POST /auth/login` com hash criptográfico **BCrypt custo 10** e *timeout* de gateway de 3.000 ms) até o sistema apresentar degradação severa e falhas por saturação.

## 2. Resultados da Rampa de Estresse

| Usuários Simultâneos | Total Req. | Vazão | P50 | P95 | Máximo | Falhas / Timeouts | Violação SLA (>2s) | Estado Operacional |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **50** | 100 | 53.45 req/s | 363.34 ms | **1498.81 ms** | 1511.19 ms | 0 (0%) | 0% | **DEGRADADO** |
| **150** | 300 | 87.61 req/s | 1640.01 ms | **1719.19 ms** | 2956.14 ms | 0 (0%) | 0.67% | **DEGRADADO** |
| **250** | 500 | 80.97 req/s | 2601.67 ms | **3124.51 ms** | 3133.79 ms | 59 (11.8%) | 77.8% | **SATURADO / FALHA** |
| **350** | 700 | 108.41 req/s | 3004.58 ms | **3250.11 ms** | 3257.68 ms | 373 (53.29%) | 94.71% | **SATURADO / FALHA** |

## 3. Diagnóstico dos Gargalos e Limites Identificados

- **Pico de Vazão Efetiva:** **108.41 req/s** em **350 usuários simultâneos**.
- **Ponto de Inflexão (Início de Degradação):** **50 usuários simultâneos** — momento em que o enfileiramento no *pool* HikariCP (padrão de 10 conexões JDBC) e a disputa de CPU pelo algoritmo BCrypt elevam a cauda P95 acima de 1 segundo.
- **Ponto de Saturação / Falha:** **250 usuários simultâneos (11.8% de timeouts/rejeições)** — saturação das 200 *worker threads* padrão do Tomcat embarcado somada ao esgotamento de CPU de container.
- **Resiliência Pós-Estresse:** imediatamente após o término da rampa extrema, o endpoint `/actuator/health` respondeu `UP` sem travamento permanente (*deadlock*) nem queda do processo JVM.

## 4. Evidências Gráficas

- Curva de Saturação (P95 vs Taxa de Falha): `graficos/01-estresse-curva-saturacao.png`
- Vazão Efetiva vs Violação de SLA: `graficos/02-estresse-vazao-limite.png`
