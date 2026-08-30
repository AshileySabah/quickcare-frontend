# QuickCare

Front-end do QuickCare, um marketplace de profissionais de saúde. O funcionamento é orientado a demanda: em vez de o paciente navegar por uma lista de profissionais e escolher às cegas, ele descreve o que precisa uma única vez, e são os profissionais qualificados que competem por aquele atendimento enviando propostas. Isso inverte o esforço de busca — o paciente recebe as opções já filtradas pela especialidade certa, e o profissional só vê demandas reais, dentro da área em que está habilitado a atuar.

Projeto de TCC do curso de Análise e Desenvolvimento de Sistemas (FATEC).

## Contexto de negócio

### Como funciona, passo a passo

1. O paciente descreve uma necessidade de atendimento (ex.: "nutricionista para dieta com restrição a lactose"), informando especialidade, modalidade (presencial ou online) e prazo desejado. Isso cria uma solicitação.
2. Profissionais daquela especialidade — desde que já aprovados pelo admin — enxergam a solicitação e podem enviar uma proposta: preço, abordagem de atendimento e prazo estimado. Mais de um profissional pode propor para a mesma solicitação.
3. O paciente compara as propostas recebidas e aceita uma. Nesse momento as demais propostas daquela solicitação são recusadas automaticamente, e o atendimento passa a ser considerado em andamento.
4. Ao final do atendimento, o paciente marca a solicitação como concluída. Ele também pode cancelá-la a qualquer momento antes da conclusão, caso desista.

O papel do admin existe para dar confiança ao paciente: qualquer pessoa pode se cadastrar como profissional, mas só passa a aparecer para os pacientes depois que o admin confere o documento de registro profissional enviado (CRN, CRP, CREFITO etc.) e aprova o cadastro.

### Perfis de usuário

- **Paciente** — cria solicitações de atendimento, recebe propostas de profissionais, escolhe e aceita uma proposta, acompanha o histórico dos atendimentos.
- **Profissional** — cadastra-se informando especialidade e documento de registro profissional (CRN, CRP, CREFITO etc.), aguarda validação do admin, e só depois disso pode visualizar solicitações da sua especialidade e enviar propostas.
- **Admin** — audita os cadastros de profissionais pendentes, analisa o documento enviado e aprova ou reprova (com justificativa) o acesso do profissional à plataforma.

### Máquina de estados da solicitação

```
Aberta → Recebendo propostas → Em andamento → Concluída
   ↘___________↘___________↘
              Cancelada (pelo paciente, a qualquer momento antes de Concluída)
```

- A solicitação nasce **Aberta**.
- Ao receber a primeira proposta, passa automaticamente para **Recebendo propostas**.
- Quando o paciente aceita uma proposta, a solicitação vai para **Em andamento**, todas as demais propostas pendentes são recusadas automaticamente, e a solicitação trava para edição.
- O paciente marca a solicitação como **Concluída** ao final do atendimento.
- O paciente pode **cancelar** a solicitação a qualquer momento antes da conclusão.

### Máquina de estados da proposta

```
Pendente → Aceita
        → Recusada (automático, quando outra proposta da mesma solicitação é aceita)
        → Cancelada (pelo próprio profissional)
```

### Regras de negócio centrais

- O paciente só edita a solicitação enquanto ela não tiver uma proposta aceita (status `Aberta` ou `Recebendo propostas`).
- O profissional só edita ou cancela a própria proposta enquanto ela estiver `Pendente`.
- O profissional só visualiza e envia propostas para solicitações da especialidade em que está **validado e aprovado** pelo admin.
- Um profissional recém-cadastrado fica com status `Pendente` e é redirecionado para uma tela de "aguardando validação" até que o admin decida.

Essas regras estão implementadas como métodos de serviço (`RequestService`, `ProposalService`), não espalhadas pelos componentes — ver seção [Arquitetura](#arquitetura).

## Stack técnica

- **Angular 19** — standalone components (sem `NgModule`), Signals para estado local e reativo (sem NgRx)
- **SASS** com design system tokenizado (cores, espaçamento, tipografia, raio, breakpoints via funções/mixins SCSS — nenhum valor solto no código)
- **Reactive Forms** com validação condicional (ex.: endereço só é obrigatório quando a modalidade é presencial)
- **RxJS** para orquestrar as chamadas assíncronas dos services mockados

## Estado atual: front-end mockado

Esta etapa do projeto entrega o front-end **completo e navegável fim a fim para os três perfis**, mas ainda **sem backend real**. Todos os dados vêm de arquivos `*.mock.ts` isolados em `src/app/mocks/`, e a lógica de autenticação/autorização roda inteiramente no navegador.

A interface entre o front e os dados já foi desenhada para que a troca por chamadas HTTP reais não exija reescrever componentes ou templates:

- `AuthService`, `RequestService` e `ProposalService` já expõem métodos que retornam `Observable`, exatamente como fariam com `HttpClient` — só a implementação interna muda.
- O interceptor de CSRF (`csrf.interceptor.ts`) já está implementado "de verdade" (lê o cookie `csrf_token` e injeta o header `X-CSRF-Token` em métodos mutantes, com `withCredentials: true` em toda requisição), esperando apenas o backend real passar a emitir esse cookie.
- O modelo de autenticação alvo é **JWT em cookies HttpOnly + Secure + SameSite=Strict** (access token curto, refresh token restrito a `/auth/refresh`) — o Angular nunca lê nem guarda token algum.

## Arquitetura

```
src/
├── styles/
│   └── tokens/         → design tokens SCSS (_colors, _spacing, _typography, _radius, _breakpoints)
│   └── patterns/        → mixins de layout reaproveitados entre telas (auth-page, app-shell, request-list)
└── app/
    ├── core/
    │   ├── auth/         → AuthService (mockado, interface pronta para API real)
    │   ├── guards/        → authGuard, roleGuard, professionalStatusGuard
    │   ├── interceptors/  → csrfInterceptor + utilitário de cookies
    │   ├── models/        → interfaces/enums de domínio (User, ServiceRequest, Proposal, Specialty...)
    │   └── services/      → RequestService e ProposalService (máquinas de estado) + utilitário de simulação de rede
    ├── shared/
    │   └── ui/            → design system: Button, Input, Select, Textarea, Card, Badge, Modal, Toast,
    │                         StatusBadge, ProposalCard, VerifiedBadge, Skeleton, EmptyState, ErrorState
    ├── features/
    │   ├── auth/          → login, seleção de cadastro, acesso negado
    │   ├── patient/        → dashboard, nova/editar solicitação, detalhe + propostas, histórico, perfil
    │   ├── professional/   → cadastro c/ upload de documento, aguardando validação, home por especialidade,
    │   │                     envio/edição de proposta, minhas propostas, perfil
    │   └── admin/          → dashboard de pendentes, aprovação/reprovação de profissionais
    └── mocks/              → *.mock.ts (usuários, especialidades, solicitações, propostas, credenciais)
```

### Por que os services concentram a lógica de status

`RequestService` e `ProposalService` são os únicos lugares que sabem transicionar status (`markReceivingProposals`, `markInProgress`, `acceptProposal` etc.) e decidir quem pode editar/cancelar o quê (`canEdit`, `canCancel`). Os componentes de tela apenas chamam esses métodos e reagem ao resultado — isso deixa a regra de negócio testável isoladamente (ver `*.service.spec.ts`) e evita que a mesma regra seja reimplementada (e diverja) em várias telas.

### Estados de UI

Toda tela com dado assíncrono trata 4 estados — loading (skeleton), vazio (mensagem + CTA), erro (mensagem + "tentar novamente") e preenchido — usando os componentes `ui-skeleton`, `ui-empty-state` e `ui-error-state` do design system.

## Rodando o projeto

```bash
npm install
ng serve
```

Acesse `http://localhost:4200`. Contas de teste (senha `quickcare123` para todas, ver `src/app/mocks/credentials.mock.ts`):

| Perfil | E-mail | Observação |
| --- | --- | --- |
| Paciente | `ana.souza@email.com` | possui solicitações em vários status |
| Profissional aprovado | `mariana.alves@email.com` | nutricionista, pode enviar propostas |
| Profissional pendente | `fernanda.costa@email.com` | cai na tela de aguardando validação |
| Profissional reprovado | `ricardo.nunes@email.com` | cai na tela de aguardando validação com motivo |
| Admin | `patricia.gomes@quickcare.com` | acessa o dashboard de pendentes |

### Testes

```bash
ng test
```

Cobre as transições de status e as regras de permissão de `RequestService` e `ProposalService`.

### Build

```bash
ng build
```
