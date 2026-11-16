# Relatório Técnico NF-02 — Teste de Carga (500 Usuários Simultâneos)

- **Característica ISO/IEC 25010:** Eficiência de Desempenho — Capacidade (*Capacity & Resource Utilization*)
- **Data/Hora da Execução:** 16/11/2026, 01:54:13
- **Ambiente Avaliado:** `LOCAL DOCKER` (`http://localhost:8080` + PostgreSQL 16/PostGIS)
- **Resultado Global:** **APROVADO (Suportou 500 acessos simultâneos sem queda)**

## 1. Objetivo

Verificar o comportamento, a vazão (*throughput*), os tempos de resposta sob concorrência e o consumo de recursos de infraestrutura da plataforma **QuickCare** com **500 pacientes e profissionais acessando simultaneamente** fluxos reais de busca de profissionais, acompanhamento de solicitações e consulta de demandas compatíveis.

## 2. Distribuição da Carga Mista (Workload Realista)

- **40% Pacientes buscando profissionais** (`GET /publico/profissionais` geral e filtrado por UF/modalidade)
- **25% Pacientes consultando painel e catálogo** (`GET /solicitacoes` e `GET /especialidades`)
- **25% Profissionais consultando demandas disponíveis** (`GET /solicitacoes/disponiveis`)
- **10% Visitantes em mural público** (`GET /publico/solicitacoes`)

## 3. Resultados por Patamar de Simultaneidade

| Estágio | Usuários Simultâneos | Total Req. | Vazão Média | P50 | P90 | P95 | P99 | Taxa de Sucesso |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Rampa Inicial (100 simultâneos) | **100** | 400 | **81.93 req/s** | 778.91 ms | 2608.94 ms | **2626.65 ms** | 2636.57 ms | 100.00% |
| Carga Intermediária (250 simultâneos) | **250** | 1000 | **143.49 req/s** | 1514.78 ms | 2639.93 ms | **2675.92 ms** | 2934.79 ms | 100.00% |
| Carga Alvo (500 simultâneos) | **500** | 2000 | **176.16 req/s** | 2588.31 ms | 3528.32 ms | **3890.7 ms** | 4922.13 ms | 100.00% |

## 4. Telemetria dos Containers Docker no Pico (500 Simultâneos)

| Container | Uso de CPU | Consumo de Memória | % Memória Alocada |
| :--- | :---: | :---: | :---: |
| `quickcare-backend` | 590.75% | 697.4MiB / 15.51GiB | 4.39% |
| `quickcare-postgres` | 203.32% | 167.1MiB / 15.51GiB | 1.05% |

## 5. Conclusão Técnica

No patamar alvo de **500 pacientes/profissionais simultâneos** (2.000 requisições concorrentes em rajada sustentada), o backend Spring Boot + PostgreSQL/PostGIS processou **2000/2000** chamadas com **100.00% de sucesso**, atingindo vazão de **176.16 req/s**, mediana **P50 de 2588.31 ms** e **P95 de 3890.7 ms**, confirmando elasticidade adequada do pool de conexões HikariCP e das threads do servidor embarcado.

## 6. Evidências Gráficas

- Curva Vazão vs Latência: `graficos/01-carga-vazao-vs-latencia.png`
- Evolução dos Percentis (P50–P99): `graficos/02-carga-distribuicao-percentis.png`
