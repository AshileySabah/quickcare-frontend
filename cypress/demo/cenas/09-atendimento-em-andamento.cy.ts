import { api, route } from '../../support/api';
import { inHours } from '../../support/factories';
import {
  CAMILA,
  DIEGO,
  MARIANA,
  RAFAEL,
  SOLICITACAO_ID,
  aceitaDe,
  avisoPara,
  perfilMarianaParaProfissional,
  propostaDe,
  sessaoPacienteDemo,
  sessaoProfissionalDemo,
  solicitacaoMariana,
  vagas,
} from '../support/elenco';
import { RITMO, entrar, legenda, notificacaoAoVivo, pausa, quem } from '../support/estudio';

describe('Cena 9 · Atendimento em andamento', () => {
  it('o atendimento começa sozinho e Rafael passa a ver os dados de saúde e emergência', () => {
    const emAndamento = aceitaDe(RAFAEL, { status: 'EM_ANDAMENTO', inicio: inHours(-0.2), termino: inHours(1.8) });
    const aviso = avisoPara(
      'PROFISSIONAL',
      'ATENDIMENTO_INICIADO',
      'Atendimento começou',
      `O atendimento com ${MARIANA.nome} começou agora.`,
      '/professional/propostas',
    );
    cy.intercept(route('GET', '/notificacoes'), (req) => req.reply(req.query['perfil'] === 'PROFISSIONAL' ? [aviso] : []));
    cy.intercept(route('PATCH', /^\/notificacoes\/\d+\/lida$/), { ...aviso, lida: true });
    api('GET', '/propostas', [emAndamento]);
    api('GET', `/pacientes/${MARIANA.usuarioId}/perfil`, {
      ...perfilMarianaParaProfissional(),
      saude: {
        alergias: 'Dipirona',
        condicoesSaude: 'Recuperação de cirurgia no joelho direito.',
        medicamentosEmUso: 'Anti-inflamatório de 12 em 12 horas.',
      },
      contatosEmergencia: [{ nome: 'Paulo Souza', telefone: '11991234567' }],
    });
    const solicitacao = solicitacaoMariana({
      status: 'EM_ANDAMENTO',
      totalPropostas: 3,
      atendimentoEmAndamento: true,
      profissionais: vagas(true, true),
    });
    api('GET', '/solicitacoes', [solicitacao]);
    api('GET', `/solicitacoes/${SOLICITACAO_ID}`, solicitacao);
    api('GET', `/solicitacoes/${SOLICITACAO_ID}/propostas`, [emAndamento, aceitaDe(CAMILA), propostaDe(DIEGO, { status: 'RECUSADA' })]);

    entrar('/professional', sessaoProfissionalDemo(RAFAEL));
    legenda('Cena 9 · Atendimento em andamento', 'Rafael Lima, enfermeiro');
    pausa();
    notificacaoAoVivo(aviso);
    cy.get('.notification-bell__badge').should('contain', '1');
    pausa();
    cy.get('.notification-bell__trigger').click();
    cy.contains('.notification-bell__item', 'Atendimento começou').click();
    cy.location('pathname').should('eq', '/professional/propostas');
    cy.get('section[aria-label="Atendimento"]').should('contain', 'Em andamento');
    pausa(RITMO.leitura);

    cy.get(`[aria-label="Opções para ${MARIANA.nome}"]`).click();
    cy.contains('[role="menuitem"]', 'Ver perfil').click();
    cy.field('Alergias').should('have.value', 'Dipirona');
    pausa(RITMO.leitura);
    cy.field('Nome').scrollIntoView().should('have.value', 'Paulo Souza');
    pausa(RITMO.leitura);

    quem(`${MARIANA.nome}, paciente`);
    entrar(`/patient/solicitacoes/${SOLICITACAO_ID}`, sessaoPacienteDemo());
    cy.contains('ui-proposal-card', RAFAEL.nome).find('section[aria-label="Atendimento"]').should('contain', 'Em andamento');
    cy.contains('ui-proposal-card', RAFAEL.nome).scrollIntoView();
    pausa(RITMO.leitura);
  });
});
