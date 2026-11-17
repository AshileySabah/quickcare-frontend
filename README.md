# QuickCare — Front-end

Front-end do QuickCare, um marketplace de profissionais de saúde orientado a demanda. Em vez de o paciente navegar por uma lista de profissionais e escolher às cegas, ele descreve o que precisa uma única vez, e os profissionais aprovados para aquela área enviam propostas. O paciente recebe opções já filtradas, e o profissional só vê demandas reais dentro da área em que está habilitado.

Projeto de TCC do curso de Análise e Desenvolvimento de Sistemas (FATEC). A API fica no repositório `quickcare-backend`, e o README de lá detalha as regras de negócio e como subir o sistema completo.

## Equipe e links

| Nome completo | RA | Turno |
| --- | --- | --- |
| _a preencher_ | _a preencher_ | _a preencher_ |
| _a preencher_ | _a preencher_ | _a preencher_ |

- Vídeo de apresentação: _a preencher_
- Protótipo no Figma: _a preencher_
- Sistema publicado: https://quickcare-frontend.vercel.app

## Como funciona

1. O paciente se cadastra, confirma o e-mail pelo link recebido e aguarda o admin validar os documentos.
2. Já aprovado, ele cria uma **solicitação**: o que precisa, quantos profissionais de cada categoria ou especialidade, modalidade (presencial ou online) e prazo.
3. Profissionais com uma **atuação** aprovada compatível veem a solicitação e enviam **propostas** com valor, abordagem e período.
4. O paciente aceita uma proposta por vaga. Cada aceite vira um **atendimento**, que passa sozinho de agendado para em andamento, depois finalizado e por fim concluído. Os dois podem remarcar, cancelar ou relatar um problema.
5. Ao terminar, os dois se avaliam de forma anônima.

Durante tudo isso, o paciente e os profissionais aceitos conversam pelo **chat**.

### Perfis

- **Paciente**: solicitações, propostas recebidas, atendimentos, histórico, avaliações, denúncias e bloqueios.
- **Profissional**: atuações (categorias, especialidades e registro), solicitações disponíveis, minhas propostas, atendimentos.
- **Admin**: validação de cadastros, disputas, ocorrências e recursos, denúncias, banimentos, e ações gerais sobre usuários, solicitações, propostas e bloqueios.

A mesma conta pode ter os perfis de paciente e de profissional e alternar entre eles pelo seletor do header.

## Funcionalidades

- **Cadastro** de paciente e de profissional com documentos e avatar (com recorte da imagem). Depois do cadastro aparece a tela "verifique seu e-mail", e o link de confirmação já faz o login.
- **Validação**: tela "Documentos" com um card por etapa (CPF, identidade, CNPJ e registro de cada atuação), reenvio e revalidação. O admin tem pré-validação por API.
- **Solicitações e propostas**: criação, edição com reaceite, recusa, cancelamento, "Reabrir solicitação" e "Reenviar proposta".
- **Atendimentos**: painel com período, remarcação, cancelamento e relato de problema. Mostra ocorrências e bloqueio de criação quando houver.
- **Perfis públicos**, **avaliações** (estrelas e destaques), **denúncia** e **bloqueio entre usuários**.
- **Consulta pública** sem login a profissionais e a solicitações anonimizadas.
- **Notificações** pelo sino, em tempo real e separadas por perfil.
- **Segurança**: troca de e-mail e de senha, encerramento de perfil ou conta com 30 dias para recuperar, e lista de usuários bloqueados.
- **Chat**:
  - conversa individual entre o paciente e cada profissional aceito, mais um grupo por solicitação;
  - contador de não lidas no menu "Mensagens";
  - anexos (imagem, PDF, áudio, vídeo) e mensagens apagadas, que continuam no histórico como "mensagem apagada", com a opção de apagar num menu de três pontinhos;
  - busca de conversas pelo nome e pelo texto das mensagens, e busca dentro de cada conversa;
  - painel de informações com os arquivos filtrados por tipo e com os participantes, que levam ao perfil;
  - o profissional que sai da solicitação, ou que tem bloqueio com o paciente, fica só com o histórico, sem poder escrever.

## Stack técnica

- **Angular 19** com standalone components e **Signals** para o estado, sem NgRx
- **RxJS** e `HttpClient` para a API
- **@stomp/stompjs** para o WebSocket (notificações e chat)
- **SASS** com design system em tokens: cores, espaçamento, tipografia, raio e breakpoints vêm de funções e mixins SCSS, sem valores soltos
- **Reactive Forms** com validação condicional
- **cropperjs** para recortar o avatar
- Testes com Jasmine e Karma

## Autenticação

O back devolve um JWT de 7 dias no cabeçalho `X-Auth-Token`. O front guarda esse token no `localStorage` (`AuthTokenStore`), e o `authInterceptor` o envia como `Authorization: Bearer` em toda chamada à API. A conexão STOMP também se autentica com ele. Quando a sessão expira (401), abre um modal pedindo para entrar de novo e, depois do login, a requisição que falhou é repetida.

Cookies não são usados: eles eram bloqueados em aba anônima, porque o front e a API ficam em domínios diferentes.

## Arquitetura

```
src/
├── environments/      → apiUrl (environment.development.ts: localhost:8080; environment.ts: Render)
├── styles/
│   ├── tokens/        → _colors, _spacing, _typography, _radius, _breakpoints
│   └── patterns/      → mixins reaproveitados (page, card, form, details, dropdown, request-list...)
└── app/
    ├── core/
    │   ├── auth/          → AuthService, AuthTokenStore, sessão expirada
    │   ├── chat/          → ChatService (HTTP + STOMP), não lidas, modelos e utilitários
    │   ├── guards/        → autenticação, perfil e status de validação
    │   ├── interceptors/  → authInterceptor
    │   ├── forms/         → formulários reaproveitados e validadores (período, atuação, endereço, documentos)
    │   ├── lists/         → paginação (createPagination)
    │   ├── formatting/    → períodos e tempo relativo
    │   ├── models/        → interfaces e enums de domínio
    │   └── services/      → serviços de cada domínio
    ├── shared/ui/         → design system (button, forms, paginator, confirm-dialog, profile-card,
    │                        notification-bell, star-rating, layout/app-shell, user-menu...)
    └── features/
        ├── auth/          → login, confirmação de e-mail, senha, recuperar conta, sessão expirada
        ├── patient/       → dashboard, solicitações, histórico, cadastro, perfil
        ├── professional/  → home, disponíveis, propostas, atuações, cadastro, perfil
        ├── admin/         → validação, disputas, ocorrências, denúncias, gerais
        ├── attendance/    → painel e relato de problema do atendimento
        ├── chat/          → lista, conversa, painel de informações, avatar
        ├── validation/    → Documentos (etapas e reenvio)
        ├── profile/ ratings/ reports/ bans/ occurrences/ user-blocks/ security/ public/ home/
```

### Convenções

- As **regras de negócio ficam no back**. O front só mostra o que a API permite e trata os erros que ela devolve.
- Toda tela com dado assíncrono trata **carregando, vazio, erro e preenchido**.
- **Listas paginadas**: 5 itens por padrão, com opções em múltiplos de 5 (`createPagination` + `ui-paginator`).
- **Formulários inválidos**: ao enviar, os campos com erro ficam vermelhos e o foco vai para o primeiro (`InvalidFieldFocusDirective`).
- **Confirmações** usam `ui-confirm-dialog`, com os botões no par "Sim, …" / "Não, …".
- **Cores só pelos tokens**, e os textos da interface são em português.

## Rodando o projeto

### Sistema completo com Docker (recomendado)

Clone este repositório e o `quickcare-backend` lado a lado, na mesma pasta, e rode `docker compose up --build` dentro do `quickcare-backend`. O compose builda este front com a configuração `docker` (API em `http://localhost:8080`), serve com nginx em http://localhost:4200 e sobe também a API, o banco e o Mailpit. O passo a passo completo está no README do back-end.

### Só o front, para desenvolvimento

Pré-requisitos: **Node.js 22 LTS** (testado com 22.18.0) e **npm 10** (testado com 10.9.3), com a API rodando em `http://localhost:8080`.

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

### Contas de teste

A massa local do back cria contas `*@quickcare.dev`, todas com a senha `Senha@123`:

| Conta | Situação |
| --- | --- |
| `admin@quickcare.dev` | admin |
| `paciente@quickcare.dev` | paciente aprovado |
| `profissional@quickcare.dev` | profissional aprovado |
| `fernanda@quickcare.dev` | enfermeira de Curativos aprovada (segunda profissional da demonstração) |
| `ambos@quickcare.dev` | conta com os dois perfis |
| `paciente.pendente@quickcare.dev`, `profissional.pendente@quickcare.dev` | aguardando validação |
| `chat.paciente@`, `chat.enfermeira@`, `chat.cuidador@quickcare.dev` | cenário pronto de chat com grupo e dois profissionais |

### Testes

```bash
npm test
```

### Build

```bash
npm run build
```

O `npm start` usa `environment.development.ts`, que aponta para a API local. O build de produção usa `environment.ts`, que aponta para a API no Render. O front é publicado na Vercel. A configuração `docker` (`ng build --configuration docker`) usa `environment.docker.ts`, que aponta para `http://localhost:8080`, e é a que o `Dockerfile` usa.
