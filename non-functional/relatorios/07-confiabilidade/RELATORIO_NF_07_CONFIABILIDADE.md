# Relatório Técnico NF-07 — Teste de Confiabilidade (Estabilidade e Maturidade)

- **Característica ISO/IEC 25010:** Confiabilidade — Maturidade (*Reliability — Maturity*)
- **Data/Hora da Execução:** 16/11/2026, 02:08:53
- **Ambiente Avaliado:** `LOCAL`
- **Resultado Global:** **APROVADO (640 requisições sustentadas com 100% de sucesso e consistência transacional)**

## 1. Objetivo

Avaliar a estabilidade e o funcionamento consistente do **QuickCare** ao longo de ciclos repetidos de operação concorrente (*Soak Test*), verificando ausência de falhas intermitentes, ausência de degradação progressiva de tempo de resposta (*memory leak*) e integridade determinística da máquina de estados de solicitações.

## 2. Estabilidade ao Longo das Janelas Consecutivas

| Janela | Requisições | Taxa de Sucesso | Latência P50 | Latência P95 | Vazão Sustentada |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Janela #01 | 80 | **100%** | 28.02 ms | 133.85 ms | 213.92 req/s |
| Janela #02 | 80 | **100%** | 28.95 ms | 135.24 ms | 220.24 req/s |
| Janela #03 | 80 | **100%** | 25.45 ms | 117.41 ms | 255.41 req/s |
| Janela #04 | 80 | **100%** | 23.33 ms | 136.76 ms | 258.34 req/s |
| Janela #05 | 80 | **100%** | 22.8 ms | 133.26 ms | 256.96 req/s |
| Janela #06 | 80 | **100%** | 23.87 ms | 121.37 ms | 269.62 req/s |
| Janela #07 | 80 | **100%** | 23.81 ms | 117.95 ms | 267 req/s |
| Janela #08 | 80 | **100%** | 31.72 ms | 153.46 ms | 202.65 req/s |

## 3. Análise de Degradação e Consistência Transacional

- **Comparativo Inicial vs Final (P50):** início em **28.49 ms** vs término em **27.77 ms** — sem tendência de degradação progressiva ou vazamento de memória.
- **Determinismo Transacional:** Criação HTTP 201 (ID #58, status=ABERTA) -> 3 leituras consecutivas determinísticas (mesmo ID, schema e estado) -> Transição atômica ABERTA -> CANCELADA confirmada (**100% Íntegro**).

## 4. Evidência Gráfica

- Série Temporal de Estabilidade (Soak Test): `graficos/01-confiabilidade-estabilidade-temporal.png`
