# Relatório Técnico NF-01 — Teste de Desempenho

- **Característica ISO/IEC 25010:** Eficiência de Desempenho (*Performance Efficiency — Time Behaviour*)
- **Data/Hora da Execução:** 16/11/2026, 01:50:50
- **Ambiente Avaliado:** `LOCAL` (Frontend: `http://localhost:4200` | Backend: `http://localhost:8080`)
- **Resultado Global:** **APROVADO (100% dentro do SLA)**

## 1. Objetivo

Avaliar a velocidade e a capacidade de resposta da plataforma **QuickCare** sob operação nominal, com ênfase especial no **tempo de carregamento da busca de profissionais** (tanto no processamento da API REST/PostgreSQL quanto na renderização completa dos cartões no navegador Angular 19).

## 2. Desempenho dos Endpoints da API REST (60 amostras por rota)

| Cenário Avaliado | Rota HTTP | Req. | Média | P50 | P95 | P99 | Vazão | Meta P95 | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Busca Profissionais (Geral) | `/publico/profissionais` | 60 | 177.46 ms | 175.51 ms | **242.54 ms** | 255.98 ms | 27.48 req/s | <= 500 ms | APROVADO |
| Busca Profissionais (SP/Presencial) | `/publico/profissionais?uf=SP&modalidade=PRESENCIAL` | 60 | 138.26 ms | 135.91 ms | **176.66 ms** | 223.52 ms | 35.31 req/s | <= 500 ms | APROVADO |
| Busca Pública Solicitações | `/publico/solicitacoes` | 60 | 16.51 ms | 15.5 ms | **29.08 ms** | 38.21 ms | 287.87 req/s | <= 300 ms | APROVADO |
| Catálogo Especialidades | `/especialidades` | 60 | 10.22 ms | 8.99 ms | **20.89 ms** | 35.81 ms | 459.74 req/s | <= 200 ms | APROVADO |
| Painel Solicitações (Paciente) | `/solicitacoes` | 60 | 29.34 ms | 28.06 ms | **50.45 ms** | 60.01 ms | 164.46 req/s | <= 350 ms | APROVADO |
| Demandas Disponíveis (Profissional) | `/solicitacoes/disponiveis` | 60 | 29.93 ms | 29.3 ms | **40.24 ms** | 45.34 ms | 160.63 req/s | <= 400 ms | APROVADO |

## 3. Desempenho de Renderização no Navegador (Web Vitals / Chromium)

| Tela Avaliada | Rota SPA | TTFB | FCP | DOM Interactive | Renderização Total (c/ Dados) | Meta SLA | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Home Pública | `/` | 3.9 ms | 376 ms | 16.5 ms | **393.39 ms** | <= 2500 ms | APROVADO |
| Busca de Profissionais | `/consulta/profissionais` | 2.7 ms | 420 ms | 13.9 ms | **543.18 ms** | <= 2500 ms | APROVADO |
| Busca de Solicitações | `/consulta/solicitacoes` | 4 ms | 504 ms | 16.9 ms | **529.84 ms** | <= 2500 ms | APROVADO |
| Tela de Login | `/entrar` | 4 ms | 384 ms | 17.5 ms | **431.5 ms** | <= 2000 ms | APROVADO |

## 4. Análise Específica — Busca de Profissionais

- **API `GET /publico/profissionais`:** tempo mediano (**P50**) de **175.51 ms** e **P95** de **242.54 ms** (0% de erros em 60 chamadas).
- **Tela `/consulta/profissionais` (ponta a ponta até ocultação do skeleton e exibição dos profissionais):** **543.18 ms**, substancialmente abaixo do limiar de **2.500 ms** recomendado pelo Google Core Web Vitals (*Good LCP*).

## 5. Evidências Gráficas e Visuais

- Gráfico de Percentis da API: `graficos/01-latencia-api-percentis.png`
- Gráfico de Carregamento Frontend: `graficos/02-frontend-tempos-carregamento.png`
- Captura da Busca de Profissionais Renderizada: `prints/01-busca-profissionais-carregada.png`
