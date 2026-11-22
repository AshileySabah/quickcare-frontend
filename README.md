# QuickCare — Front-end

## Sobre o projeto

O QuickCare é uma plataforma web que conecta pacientes a profissionais de saúde por meio de solicitações. Foi desenvolvido como Trabalho de Conclusão de Curso de Análise e Desenvolvimento de Sistemas da FATEC.

### O problema

A contratação de profissionais de saúde, principalmente para atendimento domiciliar, costuma depender de indicações, grupos de mensagens ou listas de profissionais. O paciente precisa falar com cada um para saber disponibilidade e preço, e nem sempre consegue confirmar se o profissional é habilitado.

### Como o QuickCare resolve

O paciente publica uma única solicitação com as especialidades, a quantidade de profissionais, a modalidade (presencial ou online) e o endereço. Os profissionais habilitados naquela área, e dentro do seu raio de atendimento, enviam propostas com valor e abordagem. Cada proposta aceita vira um atendimento acompanhado pela plataforma.

O cadastro do profissional passa por validação em etapas (CPF, documento de identidade, CNPJ e registro no conselho de classe) antes de ele poder enviar propostas.

### Público-alvo

Pacientes e familiares que precisam de atendimento em saúde, como enfermagem, cuidador, fisioterapia ou consulta, e profissionais de saúde que prestam esses serviços.

### Este repositório

Interface web do QuickCare, em Angular. Consome a API do `quickcare-backend` por HTTP (REST) e WebSocket. As regras de negócio ficam no back-end: o front mostra o que a API permite e trata os erros que ela devolve.

## Links

| O quê                   | Endereço                                          |
| ----------------------- | ------------------------------------------------- |
| Sistema em produção     | https://quickcare-frontend.vercel.app             |
| API em produção         | https://quickcare-backend-b4a4.onrender.com       |
| Repositório do back-end | https://github.com/AshileySabah/quickcare-backend |

A API roda no plano gratuito do Render. A primeira chamada depois de um tempo parado pode demorar.

## Integrantes

- Ashiley Sabrina Santiago Rodrigues
- Yasmin Feliciano Pereira Serafim de Lima
- Vinicius Santana Barcellos

Orientador: Carlos Henrique Verissimo Pereira.

## Perfis de usuário

- **Paciente**: cria solicitações, escolhe entre as propostas recebidas e acompanha os atendimentos.
- **Profissional**: cadastra uma ou mais atuações (categoria, especialidades e registro profissional) e envia propostas para as solicitações compatíveis.
- **Admin**: valida cadastros e modera a plataforma (disputas, denúncias, ocorrências, recursos e banimentos).

Uma mesma conta pode ter os perfis de paciente e de profissional e alternar entre eles pelo seletor do header, sem sair. O admin não pode ter outro perfil.

## Funcionalidades

### Cadastro e acesso

- Cadastro de paciente e de profissional com documentos e avatar, com recorte da imagem.
- Endereço preenchido automaticamente a partir do CEP.
- Tela "verifique seu e-mail" depois do cadastro. O link de confirmação já faz o login.
- Login, recuperação de senha e aviso de sessão expirada com novo login sem perder a ação em andamento.
- Segurança da conta: troca de e-mail e de senha, encerramento de perfil ou conta com 30 dias para recuperar e lista de usuários bloqueados.

### Validação cadastral

- Tela "Documentos" com um card por etapa (CPF, identidade, CNPJ e registro de cada atuação), reenvio e revalidação.
- Painel do admin para aprovar ou reprovar cada etapa, com pré-validação de CPF e CNPJ por API. Esse painel de pré-validação pode ser ligado ou desligado por feature flag.

### Solicitações e propostas

- Criação e edição de solicitações, com reaceite quando algo muda depois do aceite.
- Envio de propostas, recusa, cancelamento, "Reabrir solicitação" e "Reenviar proposta".
- Consulta pública, sem login, a profissionais e a solicitações anonimizadas.

### Atendimentos

- Painel do atendimento com período, remarcação, cancelamento e relato de problema.
- Exibição de ocorrências e do bloqueio de criação, quando houver.

### Chat e notificações

- Conversa individual entre o paciente e cada profissional aceito, mais um grupo por solicitação.
- Anexos (imagem, PDF, áudio e vídeo) e mensagens apagadas, que continuam no histórico como "mensagem apagada".
- Busca de conversas pelo nome e pelo texto das mensagens, e busca dentro de cada conversa.
- Painel de informações com os arquivos filtrados por tipo e os participantes, com link para o perfil.
- Contador de não lidas no menu "Mensagens".
- O profissional que sai da solicitação, ou que tem bloqueio com o paciente, fica só com o histórico, sem poder escrever.
- Notificações pelo sino, em tempo real e separadas por perfil.

### Avaliação e moderação

- Perfis públicos de profissional e de paciente.
- Avaliação com estrelas e destaques depois do atendimento.
- Denúncia, bloqueio entre usuários e telas de banimento e recurso.
- Painel do admin com validação, disputas, ocorrências, denúncias e ações gerais sobre usuários, solicitações, propostas e bloqueios.

## Tecnologias

### Stack

| Tecnologia         | Uso                                         |
| ------------------ | ------------------------------------------- |
| Angular 19         | framework, com standalone components        |
| Signals            | estado das telas, sem NgRx                  |
| RxJS e HttpClient  | chamadas à API                              |
| Reactive Forms     | formulários com validação condicional       |
| @stomp/stompjs     | WebSocket do chat e das notificações        |
| SASS               | estilos, com design system em tokens        |
| cropperjs          | recorte do avatar                           |
| @vercel/flags-core | feature flags da Vercel                     |
| Jasmine e Karma    | testes unitários                            |
| Cypress            | testes end-to-end e roteiro de demonstração |

### Infraestrutura

| Serviço  | Uso                                                          |
| -------- | ------------------------------------------------------------ |
| Vercel   | hospeda o front-end, a função `api/flags` e as feature flags |
| Render   | hospeda a API                                                |
| Supabase | banco e arquivos, acessados apenas pela API                  |

### Serviços de terceiros

| Serviço                 | Para que serve                                                          | Chamada                       |
| ----------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| ViaCEP                  | completa o endereço a partir do CEP (`shared/ui/register/address-card`) | HTTP                          |
| Feature Flags da Vercel | controla a visibilidade de features                                     | HTTP, pela função `api/flags` |

Os demais serviços (Nominatim, Serpro, BrasilAPI, Brevo e Supabase Storage) são chamados pela API, não pelo front.

### Autenticação

- O back devolve o JWT no cabeçalho `X-Auth-Token`. O front guarda o token no `localStorage` (`AuthTokenStore`).
- O `authInterceptor` envia o token como `Authorization: Bearer <token>` em toda chamada à API. Quando a resposta traz um token renovado no `X-Auth-Token`, ele substitui o anterior.
- A conexão STOMP também se autentica com o token.
- Quando a sessão expira (401), abre um modal pedindo para entrar de novo e, depois do login, a requisição que falhou é repetida.

O token não fica em cookie porque front e API estão em domínios diferentes, e alguns navegadores bloqueiam esse tipo de cookie, principalmente na aba anônima.

### Tempo real

O front se conecta ao endpoint STOMP `/ws` da API e assina as filas privadas do usuário (`/user/queue/...`) para receber mensagens do chat e notificações. O envio de mensagens é feito por HTTP; o WebSocket só entrega o resultado em tempo real.

### Feature flags

A função `api/flags.ts`, publicada pela Vercel em `/api/flags`, avalia as flags com o `@vercel/flags-core` e devolve o resultado em JSON. O `FeatureFlagService` consulta esse endereço ao iniciar e expõe cada flag como um signal.

| Flag                  | O que controla                                              | Padrão |
| --------------------- | ----------------------------------------------------------- | ------ |
| `displayPreValidacao` | painel de pré-validação de CPF e CNPJ na validação do admin | ligada |

Localmente, com `ng serve`, a função não existe. Nesse caso a consulta falha e as flags ficam no valor padrão.

## Arquitetura e organização do código

<!-- Inserir aqui a imagem do diagrama de arquitetura (front na Vercel, API no Render, Postgres e Storage no Supabase, serviços de terceiros). -->

```
api/
└── flags.ts           → função da Vercel que avalia as feature flags
src/
├── environments/      → apiUrl de cada ambiente
├── styles/
│   ├── tokens/        → _colors, _spacing, _typography, _radius, _breakpoints
│   └── patterns/      → mixins reaproveitados (page, card, form, details, dropdown, request-list...)
└── app/
    ├── core/
    │   ├── auth/          → AuthService, AuthTokenStore, sessão expirada
    │   ├── chat/          → ChatService (HTTP + STOMP), não lidas, modelos e utilitários
    │   ├── guards/        → autenticação, perfil e status de validação
    │   ├── interceptors/  → authInterceptor
    │   ├── http/          → tratamento dos erros da API
    │   ├── forms/         → formulários reaproveitados e validadores (período, atuação, endereço, documentos)
    │   ├── lists/         → paginação (createPagination)
    │   ├── formatting/    → períodos e tempo relativo
    │   ├── models/        → interfaces e enums de domínio
    │   └── services/      → serviços de cada domínio, incluindo o FeatureFlagService
    ├── shared/ui/         → design system (button, forms, paginator, confirm-dialog, profile-card,
    │                        notification-bell, star-rating, address-card, layout/app-shell, user-menu...)
    └── features/
        ├── auth/          → login, confirmação de e-mail, senha, recuperar conta, sessão expirada
        ├── patient/       → dashboard, solicitações, histórico, cadastro, perfil
        ├── professional/  → home, disponíveis, propostas, atuações, cadastro, perfil
        ├── admin/         → validação, disputas, ocorrências, denúncias, gerais
        ├── attendance/    → painel e relato de problema do atendimento
        ├── chat/          → lista, conversa, painel de informações
        ├── validation/    → Documentos (etapas e reenvio)
        └── profile/ ratings/ reports/ bans/ occurrences/ user-blocks/ security/ public/ home/
```

### Design system

Cores, espaçamentos, tipografia, raios e breakpoints vêm dos tokens em `src/styles/tokens`, por funções e mixins SCSS. Nenhum valor fica solto no CSS dos componentes, o que mantém o padrão visual e permite mudanças globais num só lugar. Os padrões de tela que se repetem ficam em `src/styles/patterns`.

### Convenções

- Toda tela com dado assíncrono trata os estados carregando, vazio, erro e preenchido.
- Listas paginadas mostram 5 itens por padrão, com opções em múltiplos de 5 (`createPagination` + `ui-paginator`).
- Ao enviar um formulário inválido, os campos com erro ficam vermelhos e o foco vai para o primeiro (`InvalidFieldFocusDirective`).
- Confirmações usam o `ui-confirm-dialog`, com os botões no par "Sim, …" / "Não, …".
- Os textos da interface são em português.

## Como rodar localmente

### Pré-requisitos

- Node 22 e npm.
- A API rodando em `http://localhost:8080`. O passo a passo está no README do `quickcare-backend`.

### Ambientes

Não há `.env` no front. O endereço da API fica nos arquivos de `src/environments`:

| Arquivo                      | Usado em          | `apiUrl`                                      |
| ---------------------------- | ----------------- | --------------------------------------------- |
| `environment.development.ts` | `npm start`       | `http://localhost:8080`                       |
| `environment.ts`             | build de produção | `https://quickcare-backend-b4a4.onrender.com` |

Para apontar o front local para a API de produção, troque o `apiUrl` do `environment.development.ts`. Lembre de desfazer antes de commitar.

### Subindo

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

### Massa de teste

O perfil `dev` do back-end cria contas `*@quickcare.dev`, todas com a senha **`Senha@123`**:

| Conta                        | Situação                                          |
| ---------------------------- | ------------------------------------------------- |
| `admin@quickcare.dev`        | admin                                             |
| `paciente@quickcare.dev`     | paciente aprovado                                 |
| `profissional@quickcare.dev` | profissional aprovado                             |
| `ambos@quickcare.dev`        | conta com os perfis de paciente e de profissional |

A lista completa está no README do back-end.

### Scripts

| Comando             | O que faz                                                |
| ------------------- | -------------------------------------------------------- |
| `npm start`         | servidor de desenvolvimento em `localhost:4200`          |
| `npm run build`     | build de produção em `dist/`                             |
| `npm run watch`     | build contínuo no modo de desenvolvimento                |
| `npm test`          | testes unitários (Karma)                                 |
| `npm run e2e`       | sobe o front e roda os testes Cypress sem interface      |
| `npm run e2e:open`  | sobe o front e abre o Cypress                            |
| `npm run demo`      | sobe o front e grava o roteiro de demonstração em vídeo  |
| `npm run demo:open` | sobe o front e abre o roteiro de demonstração no Cypress |

## Testes

### Unitários

```bash
npm test
```

Testes com Jasmine e Karma (`*.spec.ts`) para services, guards, interceptor, validadores e componentes.

### End-to-end

```bash
npm run e2e
```

Testes com Cypress em `cypress/e2e`, organizados por área: autenticação, visitante, paciente, profissional, atendimento, conta, interações, comunicação e admin. A API é simulada com `cy.intercept`, então não é preciso subir o back-end.

### Roteiro de demonstração

```bash
npm run demo
```

As cenas em `cypress/demo/cenas` percorrem o fluxo completo do sistema, do cadastro ao banimento, em 1920×1080, e gravam vídeos em `cypress/videos/demo`. A API também é simulada.

## Produção

O front é publicado na Vercel. O build usa o `environment.ts`, que aponta para a API no Render. A função `api/flags.ts` é publicada junto e lê as flags configuradas no painel da Vercel.
