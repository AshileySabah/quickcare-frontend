import { api, apiError, route } from '../../support/api';
import {
  atendimento,
  inDays,
  problema,
  profissionalSolicitado,
  proposta,
  sessaoPaciente,
  sessaoProfissional,
  solicitacao,
} from '../../support/factories';

function comoPaciente(at: ReturnType<typeof atendimento>) {
  api('GET', '/solicitacoes/100', solicitacao({ status: 'EM_ANDAMENTO', profissionais: [profissionalSolicitado({ vagasPreenchidas: 1 })] }));
  api('GET', '/solicitacoes/100/propostas', [proposta({ status: 'ACEITA', atendimento: at })]);
  cy.visitAs('/patient/solicitacoes/100', sessaoPaciente());
}

function comoProfissional(at: ReturnType<typeof atendimento>) {
  api('GET', '/propostas', [proposta({ status: 'ACEITA', atendimento: at, solicitacao: { status: 'EM_ANDAMENTO' } })]);
  cy.visitAs('/professional/propostas', sessaoProfissional());
}

const finalizado = (extra: Parameters<typeof atendimento>[0] = {}) =>
  atendimento({ status: 'FINALIZADO', inicio: inDays(-1), termino: inDays(-1), podeRelatarProblema: true, ...extra });

describe('Problema · relatar que não foi realizado', () => {
  it('sem permissão de relatar não mostra o botão', () => {
    comoPaciente(atendimento());
    cy.button('Não foi realizado').should('not.exist');
  });

  it('paciente relata que o profissional não compareceu, com provas', () => {
    api('POST', '/atendimentos/500/problema', finalizado({ status: 'PROBLEMA_RELATADO', podeRelatarProblema: false, problema: problema() })).as('relatar');
    comoPaciente(finalizado());
    cy.button('Não foi realizado').click();
    cy.dialog('Atendimento não realizado').within(() => {
      cy.selectField('O que houve', 'outro_nao_compareceu');
      cy.contains('conta uma ocorrência para o profissional').should('not.exist');
      cy.contains('Bruno Enfermeiro tem 7 dias para confirmar ou contestar.').should('be.visible');
      cy.fillField('O que aconteceu', 'Esperei no horário combinado e ninguém apareceu nem avisou.');
      cy.get('input[type="file"]').selectFile(
        [
          { contents: Cypress.Buffer.from('a'), fileName: 'print1.png', mimeType: 'image/png' },
          { contents: Cypress.Buffer.from('b'), fileName: 'print2.pdf', mimeType: 'application/pdf' },
        ],
        { force: true },
      );
      cy.contains('print1.png').should('be.visible');
      cy.button('Enviar relato').click();
    });
    cy.wait('@relatar').its('request.headers.content-type').should('include', 'multipart/form-data');
    cy.toast('Relato enviado.').should('be.visible');
  });

  it('"combinamos de não fazer" avisa que ninguém leva ocorrência', () => {
    comoPaciente(finalizado());
    cy.button('Não foi realizado').click();
    cy.dialog('Atendimento não realizado').within(() => {
      cy.selectField('O que houve', 'combinado');
      cy.contains('sem ocorrência para ninguém').should('be.visible');
    });
  });

  it('valida motivo e descrição mínima', () => {
    comoPaciente(finalizado());
    cy.button('Não foi realizado').click();
    cy.dialog('Atendimento não realizado').within(() => {
      cy.fillField('O que aconteceu', 'curto');
      cy.button('Enviar relato').click();
      cy.contains('Campo obrigatório.').should('be.visible');
      cy.contains('Escreva pelo menos 10 caracteres.').should('be.visible');
    });
  });

  it('relato duplicado é recusado', () => {
    apiError('POST', '/atendimentos/500/problema', 'Já existe um relato de problema para este atendimento.');
    comoPaciente(finalizado());
    cy.button('Não foi realizado').click();
    cy.dialog('Atendimento não realizado').within(() => {
      cy.selectField('O que houve', 'combinado');
      cy.fillField('O que aconteceu', 'Combinamos por telefone de cancelar.');
      cy.button('Enviar relato').click();
    });
    cy.toast('Já existe um relato de problema para este atendimento.').should('be.visible');
  });

  it('quem relatou vê que aguarda a resposta do outro lado', () => {
    comoPaciente(finalizado({ status: 'PROBLEMA_RELATADO', problema: problema() }));
    cy.contains('Relato: o atendimento não foi realizado').should('be.visible');
    cy.contains('Você · Não compareceu').should('be.visible');
    cy.contains('Aguardando Bruno Enfermeiro responder até').should('be.visible');
    cy.button('Contestar').should('not.exist');
  });
});

describe('Problema · responder ao relato', () => {
  const relatoDoPaciente = () => finalizado({ status: 'PROBLEMA_RELATADO', problema: problema() });

  it('profissional confirma que não foi realizado e leva ocorrência', () => {
    api('PATCH', '/atendimentos/500/problema/confirmar', finalizado({ status: 'NAO_REALIZADO', problema: problema({ status: 'CONFIRMADO' }) })).as('confirmar');
    comoProfissional(relatoDoPaciente());
    cy.contains('Responda até').should('be.visible');
    cy.button('Confirmar que não foi realizado').click();
    cy.dialog('Confirmar que não foi realizado').within(() => {
      cy.contains('Como o relato diz que você não compareceu, conta uma ocorrência para você.').should('be.visible');
      cy.button('Sim, confirmar').click();
    });
    cy.wait('@confirmar');
    cy.toast('Você confirmou que não foi realizado.').should('be.visible');
  });

  it('profissional contesta e abre disputa', () => {
    api('POST', '/atendimentos/500/problema/contestacao', finalizado({ status: 'EM_DISPUTA', problema: problema({ status: 'EM_DISPUTA', contestacao: 'Eu fui.' }) })).as('contestar');
    comoProfissional(relatoDoPaciente());
    cy.button('Contestar').click();
    cy.dialog('Contestar o relato').within(() => {
      cy.contains('Um administrador analisa as duas versões e as provas, e decide.').should('be.visible');
      cy.fillField('A sua versão', 'Eu estive no endereço no horário e ninguém abriu a porta.');
      cy.button('Enviar contestação').click();
    });
    cy.wait('@contestar');
    cy.toast('Contestação enviada. Um administrador vai analisar.').should('be.visible');
  });

  it('contestação curta é recusada no formulário', () => {
    comoProfissional(relatoDoPaciente());
    cy.button('Contestar').click();
    cy.dialog('Contestar o relato').within(() => {
      cy.fillField('A sua versão', 'Fui');
      cy.button('Enviar contestação').click();
      cy.contains('Escreva pelo menos 10 caracteres.').should('be.visible');
    });
  });

  it('sem resposta no prazo ainda dá para contestar com o administrador', () => {
    comoProfissional(finalizado({ status: 'NAO_REALIZADO', problema: problema({ status: 'SEM_RESPOSTA' }) }));
    cy.contains('Sem resposta no prazo').should('be.visible');
    cy.button('Contestar com o administrador').should('be.visible');
    cy.button('Confirmar que não foi realizado').should('not.exist');
  });

  it('em disputa mostra as duas versões', () => {
    comoPaciente(
      finalizado({
        status: 'EM_DISPUTA',
        problema: problema({ status: 'EM_DISPUTA', contestacao: 'Eu estive lá, o paciente não abriu.', contestadoEm: inDays(-1) }),
      }),
    );
    cy.contains('Bruno Enfermeiro · Contestou').should('be.visible');
    cy.contains('Eu estive lá, o paciente não abriu.').should('be.visible');
    cy.contains('Contestado: um administrador está analisando as duas versões.').should('be.visible');
  });

  it('decidido pelo administrador mostra a decisão e a justificativa', () => {
    comoPaciente(
      finalizado({
        status: 'CONCLUIDO',
        problema: problema({ status: 'DECIDIDO', decisao: 'REALIZADO', decisaoJustificativa: 'As fotos mostram o atendimento.' }),
      }),
    );
    cy.contains('Um administrador decidiu que o atendimento foi realizado.').should('be.visible');
    cy.contains('As fotos mostram o atendimento.').should('be.visible');
  });

  it('confirmado pelos dois lados', () => {
    comoPaciente(finalizado({ status: 'NAO_REALIZADO', problema: problema({ status: 'CONFIRMADO' }) }));
    cy.contains('Confirmado pelos dois lados').should('be.visible');
  });

  it('abre o anexo do relato', () => {
    api('GET', '/atendimentos/500/problema/anexos/1', { url: 'https://arquivos.exemplo/print.png' }).as('anexo');
    comoPaciente(
      finalizado({
        status: 'PROBLEMA_RELATADO',
        problema: problema({ anexos: [{ id: 1, lado: 'PACIENTE', nomeArquivo: 'print.png', contentType: 'image/png' }] }),
      }),
    );
    cy.window().then((win) => cy.stub(win, 'open').as('abrir'));
    cy.button('print.png').click();
    cy.wait('@anexo');
    cy.get('@abrir').should('have.been.calledWith', 'https://arquivos.exemplo/print.png');
  });

  it('falha ao abrir anexo mostra o erro', () => {
    cy.intercept(route('GET', '/atendimentos/500/problema/anexos/1'), { statusCode: 404, body: { message: 'Anexo não encontrado.' } });
    comoPaciente(
      finalizado({
        status: 'PROBLEMA_RELATADO',
        problema: problema({ anexos: [{ id: 1, lado: 'PACIENTE', nomeArquivo: 'print.png', contentType: 'image/png' }] }),
      }),
    );
    cy.button('print.png').click();
    cy.toast('Anexo não encontrado.').should('be.visible');
  });
});
