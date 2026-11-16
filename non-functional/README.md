# Suíte de Testes Não Funcionais — QuickCare (ISO/IEC 25010)

Suíte isolada e removível de **Testes Não Funcionais** da plataforma **QuickCare**, estruturada em conformidade com a norma **ABNT NBR ISO/IEC 25010**, **ISO 9241-11**, **OWASP API Security Top 10** e **WCAG 2.1 AA**.

> **Isolamento Arquitetural:** Todo o código, dependências, gráficos, capturas e relatórios desta suíte residem exclusivamente na pasta `non-functional/` da branch `test/nao-funcionais`, sem modificar nenhum arquivo rastreado do Angular (`src/`, `package.json`, `angular.json`) nem do backend Spring Boot.

## Matriz de Categorias Avaliadas

| Código | Tipo de Teste | Objetivo | Ambiente Permitido | Comando |
| :--- | :--- | :--- | :--- | :--- |
| **NF-01** | **Desempenho** | Avaliar velocidade de resposta da API (P50/P95/P99) e Web Vitals (TTFB, FCP, LCP, CLS) na busca de profissionais e fluxos críticos | Local e Remoto | `npm run nf:01:local` / `npm run nf:01:remote` |
| **NF-02** | **Carga** | Verificar comportamento com **500 pacientes/profissionais acessando simultaneamente** | **Exclusivo Local (Docker)** | `npm run nf:02:local` |
| **NF-03** | **Estresse** | Aumentar progressivamente usuários simultâneos até identificar o limite de saturação/falha | **Exclusivo Local (Docker)** | `npm run nf:03:local` |
| **NF-04** | **Segurança** | Impedir acesso cruzado entre pacientes (BOLA/IDOR), escalada de privilégio, JWT adulterado, SQLi/XSS e vazamento LGPD | Local e Remoto | `npm run nf:04:local` / `npm run nf:04:remote` |
| **NF-05** | **Usabilidade** | Avaliar eficiência e facilidade de agendamento pelo paciente (tempo, cliques, validação reativa e responsividade) | Local e Remoto | `npm run nf:05:local` / `npm run nf:05:remote` |
| **NF-06** | **Acessibilidade** | Validar navegação por teclado, foco visível, semântica para leitores de tela e auditoria WCAG 2.1 AA (`axe-core`) | Local e Remoto | `npm run nf:06:local` / `npm run nf:06:remote` |
| **NF-07** | **Confiabilidade** | Verificar estabilidade sustentada (*Soak Test*) sem degradação progressiva nem falhas intermitentes | Local e Remoto | `npm run nf:07:local` / `npm run nf:07:remote` |
| **NF-08** | **Recuperação** | Avaliar tolerância a falhas, RTO (*Recovery Time Objective*) e RPO após queda e reinício do serviço backend | **Exclusivo Local (Docker)** | `npm run nf:08:local` |
| **NF-09** | **Disponibilidade** | Medir *uptime* (SLI/SLO), prontidão de componentes (*Liveness/Readiness/DB*) e resposta *Cold/Warm* | Local e Remoto | `npm run nf:09:local` / `npm run nf:09:remote` |

## Trava de Proteção ao Ambiente Gratuito (Render / Vercel)

Os scripts **NF-02 (Carga)**, **NF-03 (Estresse)** e **NF-08 (Recuperação)** possuem trava automática em `src/config/env.ts` (`assertLocalOnly`) que impede qualquer disparo acidental contra `onrender.com` ou `vercel.app`.
