import { api, apiError, route } from '../../support/api';
import {
  PACIENTE,
  PROFISSIONAL,
  conversa,
  inHours,
  mensagem,
  participante,
  sessaoPaciente,
  sessaoProfissional,
} from '../../support/factories';

const lista = () => cy.get('.chat-shell__list');

function abrirConversa(mensagens = [mensagem()], conv = conversa(), sessao = sessaoPaciente(), base = '/patient') {
  api('GET', '/conversas', [conv]);
  api('GET', '/conversas/100/mensagens', mensagens);
  cy.visitAs(`${base}/mensagens/100/2`, sessao);
}

describe('Chat · lista de conversas', () => {
  it('sem conversas mostra o vazio', () => {
    cy.visitAs('/patient/mensagens', sessaoPaciente());
    cy.contains('Nenhuma conversa ainda').should('be.visible');
  });

  it('lista conversas individuais e em grupo com a última mensagem', () => {
    api('GET', '/conversas', [
      conversa(),
      conversa({
        solicitacaoId: 101,
        tipo: 'GRUPO',
        profissionalUsuarioId: null,
        participantes: [participante('PACIENTE'), participante('PROFISSIONAL'), participante('PROFISSIONAL', { usuarioId: 7, nome: 'Carla Cuidadora' })],
        ultimaMensagem: { remetenteId: 7, conteudo: 'Chego às 8h.', dataEnvio: inHours(-1) },
      }),
    ]);
    cy.visitAs('/patient/mensagens', sessaoPaciente());
    lista().within(() => {
      cy.contains('.item', 'Olá, tudo bem?').invoke('text').should('match', /Bruno Enfermeiro[\s\S]*Individual\s+·\s+Solicitação #100/);
      cy.contains('.item', 'Chego às 8h.').invoke('text').should('match', /Grupo\s+·\s+Solicitação #101/).and('contain', 'Carla: Chego às 8h.');
    });
  });

  it('mostra o contador de mensagens não lidas na conversa e no menu', () => {
    api('GET', '/conversas', [conversa()]);
    api('GET', '/conversas/nao-lidas', { total: 3, canais: [{ solicitacaoId: 100, profissionalUsuarioId: 2, quantidade: 3 }] });
    cy.visitAs('/patient/mensagens', sessaoPaciente());
    cy.get('[aria-label="3 mensagens novas"]').should('be.visible');
    cy.get('.ui-app-header').contains('a', 'Mensagens').should('contain', '3');
  });

  it('busca por nome ou mensagem', () => {
    cy.intercept(route('GET', '/conversas'), (req) => req.reply(req.query['busca'] ? [] : [conversa()])).as('conversas');
    cy.visitAs('/patient/mensagens', sessaoPaciente());
    cy.get('input[aria-label="Buscar por nome ou mensagem"]').type('inexistente');
    cy.contains('Nenhuma conversa ou mensagem encontrada.').should('be.visible');
  });

  it('"Conversar" da solicitação abre a conversa do profissional', () => {
    api('GET', '/conversas', [conversa()]);
    api('GET', '/conversas/100/mensagens', [mensagem()]);
    cy.visitAs('/patient/mensagens/100', sessaoPaciente());
    cy.location('pathname').should('eq', '/patient/mensagens/100/2');
  });

  it('paciente cai no grupo quando existe', () => {
    api('GET', '/conversas', [conversa(), conversa({ tipo: 'GRUPO', profissionalUsuarioId: null })]);
    cy.visitAs('/patient/mensagens/100', sessaoPaciente());
    cy.location('pathname').should('eq', '/patient/mensagens/100/grupo');
  });

  it('solicitação sem conversa mostra conversa indisponível', () => {
    cy.visitAs('/patient/mensagens/999', sessaoPaciente());
    cy.contains('Você não participa de nenhuma conversa desta solicitação.').should('be.visible');
  });
});

describe('Chat · conversa', () => {
  it('mostra as mensagens e marca como lida', () => {
    api('POST', '/conversas/100/lida', { total: 0, canais: [] }).as('lida');
    abrirConversa([mensagem(), mensagem({ id: 1001, remetenteId: PACIENTE.usuarioId, conteudo: 'Oi! Tudo ótimo.' })]);
    cy.contains('.chat__title', 'Bruno Enfermeiro').should('be.visible');
    cy.contains('.chat__row', 'Olá, tudo bem?').should('not.have.class', 'chat__row--mine');
    cy.contains('.chat__row', 'Oi! Tudo ótimo.').should('have.class', 'chat__row--mine');
    cy.wait('@lida');
  });

  it('conversa vazia convida a dizer olá', () => {
    abrirConversa([]);
    cy.contains('Nenhuma mensagem ainda. Diga olá!').should('be.visible');
    cy.get('button[aria-label="Enviar mensagem"]').should('be.disabled');
  });

  it('envia mensagem de texto', () => {
    api('POST', '/mensagens', mensagem({ id: 1002, remetenteId: PACIENTE.usuarioId, conteudo: 'Pode vir às 9h?' })).as('enviar');
    abrirConversa([]);
    cy.get('textarea[aria-label="Mensagem"]').type('Pode vir às 9h?');
    cy.get('button[aria-label="Enviar mensagem"]').click();
    cy.wait('@enviar').its('request.headers.content-type').should('include', 'multipart/form-data');
    cy.contains('.chat__row--mine', 'Pode vir às 9h?').should('be.visible');
  });

  it('envia anexo PDF', () => {
    api('POST', '/mensagens', mensagem({ id: 1003, remetenteId: PACIENTE.usuarioId, conteudo: null, anexoUrl: 'https://arquivos/receita.pdf', anexoNomeOriginal: 'receita.pdf', anexoTipo: 'application/pdf' })).as('enviar');
    abrirConversa([]);
    cy.get('.chat__form input[type="file"]').selectFile({ contents: Cypress.Buffer.from('%PDF'), fileName: 'receita.pdf', mimeType: 'application/pdf' }, { force: true });
    cy.contains('.chat__selected', 'receita.pdf').should('be.visible');
    cy.get('button[aria-label="Enviar mensagem"]').click();
    cy.wait('@enviar');
    cy.contains('a.chat__file', 'receita.pdf').should('be.visible');
  });

  it('recusa anexo em formato não suportado', () => {
    abrirConversa([]);
    cy.get('.chat__form input[type="file"]').selectFile({ contents: Cypress.Buffer.from('x'), fileName: 'virus.exe', mimeType: 'application/x-msdownload' }, { force: true });
    cy.get('.chat__error').should('contain', 'Formato não suportado.');
  });

  it('falha ao enviar mostra o erro', () => {
    apiError('POST', '/mensagens', 'Envio de mensagens não permitido.', 409);
    abrirConversa([]);
    cy.get('textarea[aria-label="Mensagem"]').type('Olá');
    cy.get('button[aria-label="Enviar mensagem"]').click();
    cy.get('.chat__error').should('contain', 'Envio de mensagens não permitido.');
  });

  it('perder o acesso ao enviar recarrega a conversa', () => {
    apiError('POST', '/mensagens', 'Você não pode enviar mensagens nesta conversa.', 403);
    abrirConversa([]);
    cy.intercept(route('GET', '/conversas/100/mensagens')).as('recarregar');
    cy.get('textarea[aria-label="Mensagem"]').type('Olá');
    cy.get('button[aria-label="Enviar mensagem"]').click();
    cy.wait('@recarregar');
  });

  it('apaga a própria mensagem', () => {
    api('DELETE', '/mensagens/1001', {}).as('apagar');
    abrirConversa([mensagem({ id: 1001, remetenteId: PACIENTE.usuarioId, conteudo: 'Mensagem errada' })]);
    cy.contains('.chat__row', 'Mensagem errada').find('[aria-label="Opções da mensagem"]').click();
    cy.contains('[role="menuitem"]', 'Apagar mensagem').click();
    cy.dialog('Apagar mensagem').within(() => {
      cy.contains('A mensagem some para todos os participantes da conversa.').should('be.visible');
      cy.button('Sim, apagar').click();
    });
    cy.wait('@apagar');
  });

  it('mensagem apagada aparece como apagada', () => {
    abrirConversa([mensagem({ apagada: true, conteudo: null })]);
    cy.contains('Mensagem apagada').should('be.visible');
  });

  it('busca dentro da conversa', () => {
    abrirConversa([mensagem(), mensagem({ id: 1001, conteudo: 'Vou levar o material.' })]);
    cy.get('[aria-label="Buscar nesta conversa"]').click();
    cy.get('input[aria-label="Buscar mensagem nesta conversa"]').type('material');
    cy.contains('.chat__search-count', '1 mensagem').should('be.visible');
    cy.get('input[aria-label="Buscar mensagem nesta conversa"]').clear().type('nada disso');
    cy.contains('Nenhuma mensagem encontrada nesta conversa.').should('be.visible');
  });

  it('painel de informações mostra participantes e arquivos', () => {
    abrirConversa([mensagem({ anexoUrl: 'https://arquivos/exame.pdf', anexoNomeOriginal: 'exame.pdf', anexoTipo: 'application/pdf' })]);
    cy.get('[aria-label="Informações da conversa"]').click();
    cy.get('.info').within(() => {
      cy.contains('Participantes').should('be.visible');
      cy.contains('Bruno Enfermeiro').should('be.visible');
      cy.contains('Você').should('be.visible');
      cy.contains('.info__heading', 'Arquivos').should('contain', '1');
    });
  });

  it('conversa encerrada fica somente leitura', () => {
    abrirConversa([mensagem()], conversa({ somenteLeitura: true }));
    cy.contains('Somente leitura').should('be.visible');
    cy.contains('Esta conversa foi encerrada.').should('be.visible');
    cy.get('textarea[aria-label="Mensagem"]').should('not.exist');
  });

  it('profissional que saiu do grupo só vê o histórico', () => {
    api('GET', '/conversas', [conversa({ somenteLeitura: true })]);
    api('GET', '/conversas/100/mensagens', [mensagem({ remetenteId: PACIENTE.usuarioId })]);
    cy.visitAs('/professional/mensagens/100/2', sessaoProfissional());
    cy.contains('Você saiu desta conversa.').should('be.visible');
  });

  it('conversa de que a pessoa não participa fica indisponível', () => {
    apiError('GET', '/conversas/100/mensagens', 'Sem acesso.', 403);
    api('GET', '/conversas', []);
    cy.visitAs('/patient/mensagens/100/2', sessaoPaciente());
    cy.contains('Conversa indisponível').should('be.visible');
    cy.button('Voltar às mensagens').click();
    cy.location('pathname').should('eq', '/patient/mensagens');
  });

  it('grupo mostra o nome de quem enviou', () => {
    abrirConversa(
      [mensagem({ profissionalUsuarioId: null }), mensagem({ id: 1001, remetenteId: 7, conteudo: 'Também vou.', profissionalUsuarioId: null })],
      conversa({
        tipo: 'GRUPO',
        profissionalUsuarioId: null,
        participantes: [participante('PACIENTE'), participante('PROFISSIONAL'), participante('PROFISSIONAL', { usuarioId: 7, nome: 'Carla Cuidadora' })],
      }),
    );
    cy.visitAs('/patient/mensagens/100/grupo', sessaoPaciente());
    cy.contains('Grupo · Solicitação #100').should('be.visible');
    cy.contains('.chat__sender', 'Carla Cuidadora').should('be.visible');
  });

  it('profissional conversa com o paciente', () => {
    api('POST', '/mensagens', mensagem({ id: 1004, remetenteId: PROFISSIONAL.usuarioId, conteudo: 'Chego em 10 minutos.' })).as('enviar');
    api('GET', '/conversas', [conversa()]);
    api('GET', '/conversas/100/mensagens', []);
    cy.visitAs('/professional/mensagens/100/2', sessaoProfissional());
    cy.contains('.chat__title', 'Ana Paciente').should('be.visible');
    cy.get('textarea[aria-label="Mensagem"]').type('Chego em 10 minutos.{enter}');
    cy.wait('@enviar');
  });
});
