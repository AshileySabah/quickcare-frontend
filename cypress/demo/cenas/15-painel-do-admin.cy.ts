import { api, route } from '../../support/api';
import {
  banimento,
  bloqueioUsuarioAdmin,
  disputaDetalhe,
  disputaResumo,
  inDays,
  ocorrencia,
  parte,
  perfilAdminDetalhe,
  perfilAdminResumo,
  propostaAdmin,
  solicitacaoAdminResumo,
} from '../../support/factories';
import { CAMILA, DIEGO, MARIANA, RAFAEL, SOLICITACAO_ID, sessaoAdminDemo } from '../support/elenco';
import { RITMO, entrar, legenda, pausa } from '../support/estudio';

const RECURSO = 'Foi um mal-entendido: eu falava do material do curativo, que não estava incluso. Peço que revejam.';
const MOTIVO = 'O print confirma a cobrança fora da plataforma. Suspensão de 30 dias.';

const resumoDe = (pessoa: typeof CAMILA, perfil: 'PACIENTE' | 'PROFISSIONAL', extra: Record<string, unknown> = {}) =>
  perfilAdminResumo({ usuarioId: pessoa.usuarioId, perfil, nome: pessoa.nome, email: pessoa.email, ocorrenciasContando: 0, ...extra });

describe('Cena 15 · Painel do administrador', () => {
  it('admin decide o recurso da Camila e percorre disputas e Gerais', () => {
    let decidido = false;
    const camilaDetalhe = () =>
      perfilAdminDetalhe({
        resumo: resumoDe(CAMILA, 'PROFISSIONAL', { banido: true, recursosEmAnalise: decidido ? 0 : 1 }),
        ocorrencias: [],
        banimentos: [
          banimento({
            id: 950,
            perfil: 'PROFISSIONAL',
            fim: inDays(30),
            justificativa: MOTIVO,
            denunciaId: 600,
            podeRecorrer: false,
            recurso: decidido
              ? { status: 'NEGADO', texto: RECURSO, criadoEm: inDays(0), decididoEm: inDays(0), decididoPor: 'Admin QuickCare', justificativa: 'As mensagens deixam claro que a cobrança era pelo serviço.' }
              : { status: 'EM_ANALISE', texto: RECURSO, criadoEm: inDays(0) },
          }),
        ],
      });
    api('GET', '/admin/recursos/em-aberto', { total: 1 });
    api('GET', '/admin/disputas/em-aberto', { total: 1 });
    api('GET', '/admin/perfis', [
      resumoDe(CAMILA, 'PROFISSIONAL', { banido: true, recursosEmAnalise: 1 }),
      resumoDe(DIEGO, 'PROFISSIONAL', { ocorrenciasContando: 1 }),
      resumoDe(MARIANA, 'PACIENTE'),
      resumoDe(RAFAEL, 'PROFISSIONAL'),
    ]);
    cy.intercept(route('GET', `/admin/perfis/PROFISSIONAL/${CAMILA.usuarioId}`), (req) => req.reply(camilaDetalhe()));
    cy.intercept(route('PATCH', '/admin/banimentos/950/recurso/decisao'), (req) => {
      decidido = true;
      req.reply(camilaDetalhe());
    });
    api('GET', `/admin/perfis/PROFISSIONAL/${DIEGO.usuarioId}`, perfilAdminDetalhe({ resumo: resumoDe(DIEGO, 'PROFISSIONAL', { ocorrenciasContando: 1 }), ocorrencias: [ocorrencia()] }));
    api('GET', '/admin/disputas', [disputaResumo()]);
    api('GET', '/admin/disputas/700', disputaDetalhe());
    api('GET', '/admin/solicitacoes', [
      solicitacaoAdminResumo({ id: SOLICITACAO_ID, paciente: parte(MARIANA), servico: 'Enfermeiro(a) · Curativos + Cuidador(a)', modalidade: 'PRESENCIAL', cidade: 'São Paulo', uf: 'SP', vagas: 2, vagasPreenchidas: 1, criadoEm: inDays(0) }),
      solicitacaoAdminResumo(),
    ]);
    api('GET', '/admin/propostas', [
      propostaAdmin({ id: 201, status: 'ACEITA', solicitacaoId: SOLICITACAO_ID, paciente: parte(MARIANA), profissional: parte(RAFAEL), valor: 180, statusAtendimento: 'FINALIZADO', acoesPermitidas: [] }),
      propostaAdmin({ id: 202, status: 'CANCELADA', solicitacaoId: SOLICITACAO_ID, paciente: parte(MARIANA), profissional: parte(CAMILA), valor: 220, acoesPermitidas: ['REATIVAR'] }),
      propostaAdmin({ id: 203, status: 'RECUSADA', solicitacaoId: SOLICITACAO_ID, paciente: parte(MARIANA), profissional: parte(DIEGO), valor: 150, acoesPermitidas: ['REATIVAR'] }),
    ]);
    api('GET', '/admin/bloqueios-usuario', [
      bloqueioUsuarioAdmin({ id: 71, paciente: parte(MARIANA), profissional: parte(DIEGO), bloqueadoPor: 'PACIENTE', criadoPor: undefined, justificativa: undefined, criadoEm: inDays(0) }),
    ]);

    entrar('/admin/ocorrencias', sessaoAdminDemo());
    legenda('Cena 15 · Painel do administrador', 'Administrador');
    pausa(RITMO.leitura);
    cy.contains('.admin-profiles__card-link', CAMILA.nome).click();
    cy.contains('h1', CAMILA.nome).should('be.visible');
    cy.contains(`Recurso: ${RECURSO}`).scrollIntoView();
    pausa(RITMO.leitura);
    cy.contains('h2', 'Banimento').closest('ui-card').contains('button', 'Negar recurso').click();
    cy.dialog('Negar recurso').within(() => {
      cy.fillField('Justificativa', 'As mensagens deixam claro que a cobrança era pelo serviço.');
      pausa(600);
      cy.button('Sim, negar o recurso').click();
    });
    cy.contains('Decisão: As mensagens deixam claro').should('be.visible');
    pausa(RITMO.leitura);

    cy.get('.ui-app-header').contains('a', 'Disputas').click();
    cy.contains('.admin-disputes__card-link', 'Enfermeiro(a) · Curativos').click();
    cy.contains('Eu estive lá, o paciente não abriu a porta.').should('be.visible');
    pausa(RITMO.leitura);

    cy.get('.ui-app-header').contains('a', 'Gerais').click();
    cy.contains('.admin-profiles__card-link', MARIANA.nome).should('be.visible');
    pausa(RITMO.leitura);
    cy.contains('a', 'Solicitações').click();
    cy.contains('.admin-requests__card-link', `#${SOLICITACAO_ID}`).should('be.visible');
    pausa(RITMO.leitura);
    cy.contains('a', 'Propostas').click();
    cy.contains(`${DIEGO.nome} → ${MARIANA.nome}`).should('be.visible');
    pausa(RITMO.leitura);
    cy.contains('a', 'Bloqueios entre usuários').click();
    cy.contains('Bloqueado pelo paciente').should('be.visible');
    pausa(RITMO.leitura);
  });
});
