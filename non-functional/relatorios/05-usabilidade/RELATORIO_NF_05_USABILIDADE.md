# Relatório Técnico NF-05 — Teste de Usabilidade (ISO 9241-11 & Heurísticas de Nielsen)

- **Característica ISO/IEC 25010:** Usabilidade (*Operability, User Error Protection & Appropriateness Recognizability*)
- **Data/Hora da Execução:** 16/11/2026, 02:07:18
- **Ambiente Avaliado:** `LOCAL`
- **Resultado Global:** **APROVADO (Jornada enxuta, responsiva e tolerante a erros)**

## 1. Objetivo

Avaliar empiricamente a facilidade de utilização da plataforma **QuickCare**, verificando se o **paciente consegue solicitar/agendar um atendimento com baixo esforço cognitivo e mínimo número de cliques**, proteção contra perda de preenchimento e adaptação responsiva em dispositivos móveis.

## 2. Métricas de Eficiência, Eficácia e Heurísticas Avaliadas

| ID | Referencial Normativo / Heurística | Cenário Verificado | Valor Medido | Meta UX | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **UX-01** | Nielsen #5 e #9 — Prevenção e Recuperação de Erros | Submissão incompleta preserva texto já preenchido pelo paciente e exibe orientação clara em português | **100** | 100% preservado | **APROVADO** |
| **UX-02** | ISO 9241-11 — Eficiência (Esforço de Interação) | Quantidade de interações do paciente para concluir abertura de atendimento online | **8** | <= 10 interações | **APROVADO** |
| **UX-03** | ISO 9241-11 — Eficiência Temporal | Tempo ponta a ponta de preenchimento e confirmação da solicitação de atendimento | **0.49** | <= 8,0 s | **APROVADO** |
| **UX-04** | Nielsen #6 — Reconhecimento em vez de Memorização | Acesso direto e filtragem visual da busca de profissionais com especialidades explícitas | **0.84** | <= 3,0 s | **APROVADO** |
| **UX-05** | Nielsen #4 & Design Responsivo Mobile-First | Adaptação em tela smartphone (390x844) sem rolagem horizontal indevida nas rotas críticas | **100** | 100% | **APROVADO** |

## 3. Análise da Jornada de Agendamento pelo Paciente

- O fluxo completo desde o painel do paciente até a confirmação da solicitação (`HTTP 201 Created`) exigiu apenas **8 interações**, concluindo em **0.49 s** (com formulário condicional inteligente que oculta automaticamente os campos de endereço quando a modalidade selecionada é *Online*).
- A solicitação criada durante o ensaio foi cancelada automaticamente em seguida para preservar o banco limpo.

## 4. Evidências Geradas

- Gráfico Comparativo de Esforço UX: `graficos/01-usabilidade-eficiencia-jornada.png`
- Formulário de Solicitação Preenchido (Desktop): `prints/01-usabilidade-formulario-agendamento.png`
- Visualização Responsiva Mobile (390x844): `prints/02-usabilidade-responsividade-mobile.png`
